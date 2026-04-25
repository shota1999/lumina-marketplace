import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Ensure no REDIS_URL so we use memory fallback
vi.stubEnv('REDIS_URL', '');

const { checkRateLimit } = await import('./rate-limit');

function makeRequest(ip = '1.2.3.4'): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/test'), {
    headers: { 'x-forwarded-for': ip },
  });
}

describe('rate limiter (in-memory)', () => {
  beforeEach(() => {
    // Reset the memory store between tests by using unique routes
  });

  it('allows requests within the limit', async () => {
    const route = `test-${Date.now()}-allow`;
    const req = makeRequest();
    const result = await checkRateLimit(req, route, { max: 3, windowSec: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests exceeding the limit', async () => {
    const route = `test-${Date.now()}-block`;
    const req = makeRequest('5.5.5.5');
    const config = { max: 2, windowSec: 60 };

    await checkRateLimit(req, route, config); // 1
    await checkRateLimit(req, route, config); // 2
    const result = await checkRateLimit(req, route, config); // 3 — over limit

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('tracks different IPs separately', async () => {
    const route = `test-${Date.now()}-ip`;
    const config = { max: 1, windowSec: 60 };

    const r1 = await checkRateLimit(makeRequest('10.0.0.1'), route, config);
    const r2 = await checkRateLimit(makeRequest('10.0.0.2'), route, config);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });
});
