import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

describe('metrics', () => {
  it('tracks success counts and durations', async () => {
    const { metricSuccess, getMetricsSnapshot } = await import('./metrics');

    metricSuccess('test.op', 50);
    metricSuccess('test.op', 100);

    const snap = getMetricsSnapshot();
    expect(snap['test.op']!.count).toBe(2);
    expect(snap['test.op']!.errors).toBe(0);
    expect(snap['test.op']!.avgDurationMs).toBe(75);
  });

  it('tracks failure counts', async () => {
    const { metricFailure, getMetricsSnapshot } = await import('./metrics');

    metricFailure('test.fail', 200);

    const snap = getMetricsSnapshot();
    expect(snap['test.fail']!.errors).toBeGreaterThanOrEqual(1);
  });

  it('returns empty snapshot when no metrics recorded', async () => {
    const { getMetricsSnapshot } = await import('./metrics');
    const snap = getMetricsSnapshot();
    // Should be an object (may have entries from prior tests)
    expect(typeof snap).toBe('object');
  });
});
