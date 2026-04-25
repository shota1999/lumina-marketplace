import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';

import { safeParseBody } from './api-response';

describe('safeParseBody', () => {
  it('parses valid JSON body', async () => {
    const req = new NextRequest('http://localhost/test', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await safeParseBody(req);
    expect('data' in result).toBe(true);
    if ('data' in result) {
      expect(result.data).toEqual({ foo: 'bar' });
    }
  });

  it('returns error for invalid JSON', async () => {
    const req = new NextRequest('http://localhost/test', {
      method: 'POST',
      body: 'not json{{{',
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await safeParseBody(req);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      const body = await result.error.json();
      expect(body.error.code).toBe('BAD_REQUEST');
    }
  });

  it('rejects oversized payloads via content-length', async () => {
    const req = new NextRequest('http://localhost/test', {
      method: 'POST',
      body: '{}',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '200000', // 200KB > 100KB limit
      },
    });
    const result = await safeParseBody(req);
    expect('error' in result).toBe(true);
    if ('error' in result) {
      const body = await result.error.json();
      expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
    }
  });
});
