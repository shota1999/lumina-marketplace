import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';

import { getDb, bookings, listings } from '@lumina/db';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { verifyCheckoutSession } from '@/lib/services/payment';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { bookingId } = await params;
    const sessionId = new URL(request.url).searchParams.get('session_id');

    if (sessionId) {
      try {
        await verifyCheckoutSession(bookingId, sessionId);
      } catch {
        // Non-fatal: fall through and return current DB state
      }
    }

    const db = getDb();
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId),
    });

    if (!booking || booking.userId !== user.id) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Booking not found' }, 404);
    }

    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, booking.listingId),
      columns: {
        id: true,
        title: true,
        slug: true,
        city: true,
        country: true,
        pricePerNight: true,
        currency: true,
      },
      with: { images: { columns: { url: true }, limit: 1 } },
    });

    if (!listing) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Listing not found' }, 404);
    }

    return successResponse({
      id: booking.id,
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      guests: booking.guests,
      totalPrice: Number(booking.totalPrice),
      paidAt: booking.paidAt?.toISOString() ?? null,
      listing: {
        id: listing.id,
        title: listing.title,
        slug: listing.slug,
        city: listing.city,
        country: listing.country,
        primaryImage: listing.images?.[0]?.url ?? null,
        pricePerNight: Number(listing.pricePerNight),
        currency: listing.currency,
      },
      listingTitle: listing.title,
      currency: listing.currency,
    });
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch booking' }, 500);
  }
}
