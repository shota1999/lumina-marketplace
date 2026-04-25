import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb, listings } from '@lumina/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    const rows = await db
      .select({
        maxGuests: listings.maxGuests,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(listings)
      .where(eq(listings.status, 'published'))
      .groupBy(listings.maxGuests);

    const histogram = new Map<number, number>();
    let max = 0;
    let total = 0;
    for (const row of rows) {
      const cap = Number(row.maxGuests);
      const count = Number(row.count);
      if (!Number.isFinite(cap) || cap <= 0) continue;
      histogram.set(cap, (histogram.get(cap) ?? 0) + count);
      if (cap > max) max = cap;
      total += count;
    }

    const buckets: { guests: number; count: number }[] = [];
    for (let g = 1; g <= max; g++) {
      let fit = 0;
      for (const [cap, count] of histogram) {
        if (cap >= g) fit += count;
      }
      buckets.push({ guests: g, count: fit });
    }

    return NextResponse.json(
      { max, total, buckets },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const e = err as { message?: unknown; code?: unknown; stack?: unknown; name?: unknown };
    return NextResponse.json(
      {
        max: 0,
        total: 0,
        buckets: [],
        error: {
          name: typeof e?.name === 'string' ? e.name : null,
          code: typeof e?.code === 'string' ? e.code : null,
          message:
            typeof e?.message === 'string' && e.message
              ? e.message
              : typeof err === 'string'
                ? err
                : JSON.stringify(err, Object.getOwnPropertyNames(err ?? {})),
          stack: typeof e?.stack === 'string' ? e.stack.split('\n').slice(0, 5) : null,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
