import { NextResponse } from 'next/server';

import type { HealthStatus } from '@lumina/shared';

const startTime = Date.now();

export async function GET() {
  const checks: HealthStatus['checks'] = {};

  // DB check
  try {
    const { getDb } = await import('@lumina/db');
    const db = getDb();
    const start = Date.now();
    await db.execute(new (await import('drizzle-orm')).StringChunk('SELECT 1'));
    checks['database'] = { status: 'pass', latencyMs: Date.now() - start };
  } catch (e) {
    checks['database'] = { status: 'fail', message: String(e) };
  }

  // Redis check
  try {
    const { getRedis } = await import('@/lib/redis');
    const redis = getRedis();
    const start = Date.now();
    await redis.ping();
    checks['redis'] = { status: 'pass', latencyMs: Date.now() - start };
  } catch (e) {
    checks['redis'] = { status: 'fail', message: String(e) };
  }

  const allPassing = Object.values(checks).every((c) => c.status === 'pass');
  const anyFailing = Object.values(checks).some((c) => c.status === 'fail');

  // Metrics snapshot
  let metrics = {};
  try {
    const { getMetricsSnapshot } = await import('@/lib/metrics');
    metrics = getMetricsSnapshot();
  } catch {
    // metrics module not critical
  }

  const response = {
    status: allPassing ? 'healthy' : anyFailing ? 'unhealthy' : 'degraded',
    version: process.env['npm_package_version'] ?? '0.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks,
    metrics,
  } satisfies HealthStatus & { timestamp: string; metrics: unknown };

  return NextResponse.json(response, {
    status: response.status === 'healthy' ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
