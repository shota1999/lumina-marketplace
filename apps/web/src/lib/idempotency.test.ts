import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('REDIS_URL', '');

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('idempotency (in-memory)', () => {
  it('allows first request with a key', async () => {
    const { checkIdempotencyKey } = await import('./idempotency');
    const result = await checkIdempotencyKey(`test-key-${Date.now()}`);
    expect(result).toBe(true);
  });

  it('rejects duplicate key', async () => {
    const { checkIdempotencyKey } = await import('./idempotency');
    const key = `dup-key-${Date.now()}`;
    await checkIdempotencyKey(key);
    const result = await checkIdempotencyKey(key);
    expect(result).toBe(false);
  });

  it('different keys are independent', async () => {
    const { checkIdempotencyKey } = await import('./idempotency');
    const ts = Date.now();
    const r1 = await checkIdempotencyKey(`key-a-${ts}`);
    const r2 = await checkIdempotencyKey(`key-b-${ts}`);
    expect(r1).toBe(true);
    expect(r2).toBe(true);
  });
});
