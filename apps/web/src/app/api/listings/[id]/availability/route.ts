import { NextRequest } from 'next/server';

import { getDb, availabilityBlocks, bookings } from '@lumina/db';
import { eq, and, or, lte, gte } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!startDate || !endDate) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: 'startDate and endDate are required' },
        400,
      );
    }

    const db = getDb();

    const [blocks, confirmedBookings] = await Promise.all([
      db
        .select()
        .from(availabilityBlocks)
        .where(
          and(
            eq(availabilityBlocks.listingId, id),
            lte(availabilityBlocks.startDate, endDate),
            gte(availabilityBlocks.endDate, startDate),
          ),
        ),
      db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.listingId, id),
            or(eq(bookings.status, 'confirmed'), eq(bookings.status, 'pending')),
            lte(bookings.startDate, endDate),
            gte(bookings.endDate, startDate),
          ),
        ),
    ]);

    const bookedDates = confirmedBookings.map((b) => ({
      startDate: b.startDate,
      endDate: b.endDate,
    }));

    // In development, inject deterministic synthetic bookings so each listing
    // has realistic gaps in its calendar without needing seed data.
    if (process.env.NODE_ENV === 'development') {
      bookedDates.push(...generateSyntheticBookings(id, startDate, endDate));
    }

    return successResponse({ blocks, bookedDates });
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch availability' }, 500);
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function generateSyntheticBookings(
  listingId: string,
  startIso: string,
  endIso: string,
): Array<{ startDate: string; endDate: string }> {
  const out: Array<{ startDate: string; endDate: string }> = [];
  const rng = mulberry32(hash(listingId));
  const start = new Date(startIso);
  const end = new Date(endIso);
  const cursor = new Date(start);

  while (cursor < end) {
    // Gap of 3–11 days between synthetic bookings
    const gap = 3 + Math.floor(rng() * 9);
    cursor.setDate(cursor.getDate() + gap);
    if (cursor >= end) break;

    // Booking length: 2–6 nights
    const nights = 2 + Math.floor(rng() * 5);
    const bookStart = new Date(cursor);
    const bookEnd = new Date(cursor);
    bookEnd.setDate(bookEnd.getDate() + nights);
    if (bookEnd > end) break;

    out.push({ startDate: toIso(bookStart), endDate: toIso(bookEnd) });
    cursor.setTime(bookEnd.getTime());
  }
  return out;
}
