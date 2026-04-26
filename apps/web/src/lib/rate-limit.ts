import { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';

interface RateLimitConfig {
  /** Max requests allowed within the window */
  max: number;
  /** Window duration in seconds */
  windowSec: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

/**
 * In-memory sliding-window fallback (dev / no Redis).
 * Keyed by IP + route prefix.
 */
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

// Periodically clean expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt <= now) memoryStore.delete(key);
  }
}, 60_000).unref();

function memoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);
  const resetAt = Math.ceil(now / 1000) + config.windowSec;

  if (!entry || entry.expiresAt <= now) {
    memoryStore.set(key, { count: 1, expiresAt: now + config.windowSec * 1000 });
    return { allowed: true, remaining: config.max - 1, resetAt };
  }

  entry.count++;
  if (entry.count > config.max) {
    return { allowed: false, remaining: 0, resetAt: Math.ceil(entry.expiresAt / 1000) };
  }

  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetAt: Math.ceil(entry.expiresAt / 1000),
  };
}

async function redisRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  const { getRedis } = await import('@/lib/redis');
  const redis = getRedis();

  // Atomic increment + set-expiry via Lua script
  const script = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('EXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('TTL', KEYS[1])
    return {current, ttl}
  `;

  const result = (await redis.eval(script, 1, key, config.windowSec)) as [number, number];
  const [count, ttl] = result;
  const resetAt = Math.ceil(Date.now() / 1000) + ttl;

  return {
    allowed: count <= config.max,
    remaining: Math.max(0, config.max - count),
    resetAt,
  };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

/**
 * Check rate limit for a request.
 * Uses Redis when available, falls back to in-memory for development.
 */
export async function checkRateLimit(
  request: NextRequest,
  route: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const key = `rl:${route}:${ip}`;

  try {
    if (process.env['REDIS_URL']) {
      return await redisRateLimit(key, config);
    }
  } catch (error) {
    logger.warn('Redis rate limit failed, falling back to memory', { error: String(error) });
  }

  return memoryRateLimit(key, config);
}

/** Pre-configured rate limits per route */
export const RATE_LIMITS = {
  login: { max: 5, windowSec: 60 }, // 5 attempts/min
  register: { max: 3, windowSec: 60 }, // 3 registrations/min
  profileUpdate: { max: 10, windowSec: 60 }, // 10 updates/min
  bookingCreate: { max: 10, windowSec: 60 }, // 10 bookings/min
  bookingConfirm: { max: 10, windowSec: 60 }, // 10 confirms/min
  reviewCreate: { max: 5, windowSec: 60 }, // 5 reviews/min
  search: { max: 60, windowSec: 60 }, // 60 searches/min
} as const;
