import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

const vitalsSchema = z.object({
  name: z.enum(['LCP', 'FID', 'CLS', 'TTFB', 'INP', 'FCP']),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']).optional(),
  id: z.string().optional(),
  navigationType: z.string().optional(),
});

/**
 * POST /api/analytics/vitals
 *
 * Receives Core Web Vitals from the client. In production this would forward
 * to a time-series DB or observability platform (Datadog, Grafana, etc.).
 * For now we log and return 204.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = vitalsSchema.safeParse(body);

    if (!parsed.success) {
      return new NextResponse(null, { status: 400 });
    }

    const { name, value, rating } = parsed.data;

    // Log for observability (picked up by structured logging / Sentry)
    if (process.env['NODE_ENV'] === 'production') {
      console.log(
        JSON.stringify({
          level: 'info',
          type: 'web_vital',
          metric: name,
          value: Math.round(name === 'CLS' ? value * 1000 : value),
          rating,
          timestamp: new Date().toISOString(),
        }),
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
