import { describe, it, expect } from 'vitest';
import { injectTraceContext, extractTraceContext } from './propagation';

describe('trace context propagation', () => {
  it('injectTraceContext returns a plain object', () => {
    const carrier = injectTraceContext();
    expect(typeof carrier).toBe('object');
    expect(carrier).not.toBeNull();
  });

  it('extractTraceContext accepts an empty carrier without throwing', () => {
    const ctx = extractTraceContext({});
    expect(ctx).toBeDefined();
  });

  it('roundtrip: inject then extract does not throw', () => {
    const carrier = injectTraceContext();
    const ctx = extractTraceContext(carrier);
    expect(ctx).toBeDefined();
  });
});
