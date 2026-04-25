import { logger } from '@/lib/logger';

/**
 * Simple in-process metrics counter.
 * Tracks counts and durations — exposes via /api/health for operational visibility.
 * In production, replace with StatsD/Prometheus client.
 */

interface MetricBucket {
  count: number;
  errors: number;
  totalDurationMs: number;
}

const counters = new Map<string, MetricBucket>();

function getBucket(name: string): MetricBucket {
  let bucket = counters.get(name);
  if (!bucket) {
    bucket = { count: 0, errors: 0, totalDurationMs: 0 };
    counters.set(name, bucket);
  }
  return bucket;
}

/** Increment the success counter for a metric. */
export function metricSuccess(name: string, durationMs?: number) {
  const bucket = getBucket(name);
  bucket.count++;
  if (durationMs !== undefined) bucket.totalDurationMs += durationMs;
}

/** Increment the error counter for a metric. */
export function metricFailure(name: string, durationMs?: number) {
  const bucket = getBucket(name);
  bucket.errors++;
  if (durationMs !== undefined) bucket.totalDurationMs += durationMs;
}

/** Get a snapshot of all metrics for health/diagnostics. */
export function getMetricsSnapshot(): Record<string, { count: number; errors: number; avgDurationMs: number }> {
  const snapshot: Record<string, { count: number; errors: number; avgDurationMs: number }> = {};
  for (const [name, bucket] of counters) {
    const total = bucket.count + bucket.errors;
    snapshot[name] = {
      count: bucket.count,
      errors: bucket.errors,
      avgDurationMs: total > 0 ? Math.round(bucket.totalDurationMs / total) : 0,
    };
  }
  return snapshot;
}

/**
 * Periodically log a metrics summary (every 60s).
 * This makes metrics visible in log aggregators without dedicated infra.
 */
setInterval(() => {
  const snapshot = getMetricsSnapshot();
  if (Object.keys(snapshot).length > 0) {
    logger.info('Metrics snapshot', { metrics: snapshot });
  }
}, 60_000).unref();
