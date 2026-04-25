import Redis from 'ioredis';

let redis: Redis | undefined;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env['REDIS_URL'];
    if (!url) throw new Error('REDIS_URL is required');
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });
  }
  return redis;
}
