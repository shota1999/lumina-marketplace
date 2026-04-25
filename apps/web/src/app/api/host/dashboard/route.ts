import { NextRequest, NextResponse } from 'next/server';

import { getDb, bookings, listings } from '@lumina/db';
import { eq, and, sql, gt, inArray } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const db = getDb();

    const [earningsResult] = await db
      .select({
        totalEarnings: sql<string>`COALESCE(SUM(${bookings.totalPrice}), 0)`,
      })
      .from(bookings)
      .innerJoin(listings, eq(bookings.listingId, listings.id))
      .where(
        and(
          eq(listings.hostId, user.id),
          eq(bookings.status, 'confirmed'),
        ),
      );

    const [upcomingResult] = await db
      .select({
        upcomingBookings: sql<number>`COUNT(*)::int`,
      })
      .from(bookings)
      .innerJoin(listings, eq(bookings.listingId, listings.id))
      .where(
        and(
          eq(listings.hostId, user.id),
          gt(bookings.startDate, sql`CURRENT_DATE`),
          inArray(bookings.status, ['confirmed', 'pending']),
        ),
      );

    const [listingsResult] = await db
      .select({
        totalListings: sql<number>`COUNT(*)::int`,
      })
      .from(listings)
      .where(eq(listings.hostId, user.id));

    const [ratingResult] = await db
      .select({
        averageRating: sql<string>`COALESCE(AVG(${listings.rating}::numeric), 0)`,
      })
      .from(listings)
      .where(eq(listings.hostId, user.id));

    return successResponse({
      totalEarnings: Number(earningsResult?.totalEarnings ?? 0),
      upcomingBookings: upcomingResult?.upcomingBookings ?? 0,
      totalListings: listingsResult?.totalListings ?? 0,
      averageRating: Number(Number(ratingResult?.averageRating ?? 0).toFixed(2)),
    });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch dashboard stats' }, 500);
  }
}
