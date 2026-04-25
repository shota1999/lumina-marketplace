import { CACHE_TTL } from '@lumina/shared';

import { getRedis } from './redis';

export async function getCached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }
  const result = await fn();
  await redis.setex(key, ttl, JSON.stringify(result));
  return result;
}

export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedis();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export const cacheKeys = {
  listing: (id: string) => `listing:${id}`,
  listings: (page: number) => `listings:page:${page}`,
  search: (hash: string) => `search:${hash}`,
  facets: () => 'search:facets',
  analytics: (type: string, range: string) => `analytics:${type}:${range}`,
} as const;

export { CACHE_TTL };
