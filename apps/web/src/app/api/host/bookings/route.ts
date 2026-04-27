import { NextRequest, NextResponse } from 'next/server';

import { getDb, bookings, listings, users } from '@lumina/db';
import { and, eq, desc } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

const ALLOWED_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    const limitParam = Number(url.searchParams.get('limit'));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50;

    const filters = [eq(listings.hostId, user.id)];
    if (statusParam && (ALLOWED_STATUSES as readonly string[]).includes(statusParam)) {
      filters.push(eq(bookings.status, statusParam as (typeof ALLOWED_STATUSES)[number]));
    }

    const db = getDb();
    const results = await db
      .select({
        id: bookings.id,
        listingId: bookings.listingId,
        listingTitle: listings.title,
        guestId: bookings.userId,
        guestName: users.name,
        guestEmail: users.email,
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
      .where(and(...filters))
      .orderBy(desc(bookings.createdAt))
      .limit(limit);

    return successResponse(results);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch bookings' }, 500);
  }
}
