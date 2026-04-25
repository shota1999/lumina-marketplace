import { describe, it, expect } from 'vitest';
import { withSpan, getActiveTraceId, getActiveSpanId } from './spans';

describe('withSpan', () => {
  it('returns the result of the wrapped function', async () => {
    const result = await withSpan('test.span', {}, async () => {
      return { success: true, value: 42 };
    });

    expect(result).toEqual({ success: true, value: 42 });
  });

  it('propagates errors from the wrapped function', async () => {
    await expect(
      withSpan('test.error', {}, async () => {
        throw new Error('test error');
      }),
    ).rejects.toThrow('test error');
  });

  it('passes attributes to the span', async () => {
    // Smoke test — just ensure it doesn't throw with attributes
    const result = await withSpan(
      'test.attrs',
      { 'test.key': 'value', 'test.number': 123 },
      async () => 'ok',
    );

    expect(result).toBe('ok');
  });
});

describe('getActiveTraceId', () => {
  it('returns undefined when no active span', () => {
    expect(getActiveTraceId()).toBeUndefined();
  });
});

describe('getActiveSpanId', () => {
  it('returns undefined when no active span', () => {
    expect(getActiveSpanId()).toBeUndefined();
  });
});
