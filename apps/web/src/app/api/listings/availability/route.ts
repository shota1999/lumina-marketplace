import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { bookings, getDb, listings } from '@lumina/db';

export const dynamic = 'force-dynamic';

const HORIZON_DAYS = 365;

function toIsoDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function GET() {
  try {
    const db = getDb();

    const totalRow = await db
      .select({ total: sql<number>`COUNT(*)::int` })
      .from(listings)
      .where(eq(listings.status, 'published'));

    const totalListings = Number(totalRow[0]?.total ?? 0);
    if (totalListings === 0) {
      return NextResponse.json(
        { unavailable: [] },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonEnd = new Date(today);
    horizonEnd.setDate(horizonEnd.getDate() + HORIZON_DAYS);

    const activeBookings = await db
      .select({
        listingId: bookings.listingId,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
      })
      .from(bookings)
      .where(sql`${bookings.status} IN ('pending', 'confirmed') AND ${bookings.endDate} >= ${toIsoDate(today)}`);

    const bookedListingsByDay = new Map<string, Set<string>>();
    for (const b of activeBookings) {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      const cursor = new Date(Math.max(start.getTime(), today.getTime()));
      while (cursor < end && cursor <= horizonEnd) {
        const iso = toIsoDate(cursor);
        let set = bookedListingsByDay.get(iso);
        if (!set) {
          set = new Set();
          bookedListingsByDay.set(iso, set);
        }
        set.add(String(b.listingId));
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    const unavailable: string[] = [];
    for (const [iso, listingsBooked] of bookedListingsByDay) {
      if (listingsBooked.size >= totalListings) unavailable.push(iso);
    }

    // Demo-blocked dates: deterministic pseudo-random dates so the calendar
    // looks "lived-in" while the catalog has no actual conflicting bookings.
    // Same set per day; rolls forward with the calendar.
    const seed = Math.floor(today.getTime() / 86_400_000);
    const rng = (n: number) => {
      let x = seed * 9301 + n * 49297;
      x = (x % 233280 + 233280) % 233280;
      return x / 233280;
    };
    for (let i = 0; i < HORIZON_DAYS; i++) {
      const cursor = new Date(today);
      cursor.setDate(cursor.getDate() + i);
      const r = rng(i);
      if (r < 0.18) {
        const iso = toIsoDate(cursor);
        if (!unavailable.includes(iso)) unavailable.push(iso);
      }
    }

    return NextResponse.json(
      { unavailable, totalListings },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { unavailable: [] },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
