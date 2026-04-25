import { NextRequest, NextResponse } from 'next/server';

import { getDb, bookings, listings, users } from '@lumina/db';
import { eq, desc } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const db = getDb();

    const results = await db
      .select({
        id: bookings.id,
        listingId: bookings.listingId,
        listingTitle: listings.title,
        guestId: bookings.userId,
        guestName: users.name,
        startDate: bookings.startDate,
        endDate: bookings.endDate,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        guests: bookings.guests,
        createdAt: bookings.createdAt,
      })
      .from(bookings)
      .innerJoin(listings, eq(bookings.listingId, listings.id))
      .innerJoin(users, eq(bookings.userId, users.id))
      .where(eq(listings.hostId, user.id))
      .orderBy(desc(bookings.createdAt))
      .limit(50);

    return successResponse(results);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch bookings' }, 500);
  }
}
