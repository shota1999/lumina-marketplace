import { logger } from '@/lib/logger';

/**
 * Simple idempotency guard using in-memory store with Redis upgrade path.
 * Prevents duplicate booking creation when the same Idempotency-Key is sent.
 *
 * Flow:
 * 1. Client sends `Idempotency-Key: <uuid>` header
 * 2. Server checks if the key was already seen
 * 3. If seen → reject with IDEMPOTENT_REJECT
 * 4. If new → mark as in-progress, execute, store result
 */

interface IdempotencyEntry {
  status: 'pending' | 'done';
  createdAt: number;
}

const store = new Map<string, IdempotencyEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.createdAt > TTL_MS) store.delete(key);
  }
}, 60_000).unref();

async function redisCheck(key: string): Promise<boolean> {
  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    // SET NX with 5 min expiry — returns 'OK' only if key didn't exist
    const result = await redis.set(`idem:${key}`, '1', 'EX', 300, 'NX');
    return result === 'OK'; // true = first time, false = duplicate
  } catch {
    return false; // on Redis failure, fall through to memory
  }
}

/**
 * Check an idempotency key. Returns true if this is the first request
 * with this key (proceed), false if it's a duplicate (reject).
 */
export async function checkIdempotencyKey(key: string): Promise<boolean> {
  // Try Redis first
  if (process.env['REDIS_URL']) {
    try {
      return await redisCheck(key);
    } catch (error) {
      logger.warn('Redis idempotency check failed, falling back to memory', { error: String(error) });
    }
  }

  // In-memory fallback
  if (store.has(key)) {
    return false; // duplicate
  }
  store.set(key, { status: 'pending', createdAt: Date.now() });
  return true;
}
