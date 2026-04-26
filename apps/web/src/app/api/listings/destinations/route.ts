import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb, listings } from '@lumina/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getDb();

    const rows = await db
      .select({
        city: listings.city,
        country: listings.country,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(listings)
      .where(eq(listings.status, 'published'))
      .groupBy(listings.city, listings.country)
      .orderBy(sql`COUNT(*) DESC`);

    const destinations = rows.map((r) => ({
      city: r.city,
      country: r.country,
      count: Number(r.count),
    }));

    return NextResponse.json({ destinations }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json(
      { destinations: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
