import { NextRequest } from 'next/server';

import { eq } from 'drizzle-orm';

import { bookings, getDb, listings, users } from '@lumina/db';
import { withSpan, SpanAttr } from '@lumina/telemetry';

import { businessErrorResponse, errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { captureError } from '@/lib/error-capture';
import { createRequestLogger } from '@/lib/logger';
import { metricSuccess, metricFailure } from '@/lib/metrics';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { confirmBooking } from '@/lib/services/booking';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const startMs = Date.now();
  const log = createRequestLogger({ requestId, route: 'POST /api/bookings/:id/confirm' });

  try {
    const user = await getCurrentUser();
    if (!user) {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in to confirm' }, 401);
    }

    const rl = await checkRateLimit(request, 'bookings:confirm', RATE_LIMITS.bookingConfirm);
    if (!rl.allowed) {
      log.warn('Rate limited', { userId: user.id });
      log.done(429);
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
        429,
      );
    }

    const { id } = await params;
    log.info('Booking confirmation attempt', { userId: user.id, bookingId: id });

    const result = await withSpan(
      'booking.confirm',
      {
        [SpanAttr.BOOKING_ID]: id,
        [SpanAttr.USER_ID]: user.id,
      },
      () => confirmBooking(id, user.id, { requestId, log }),
    );

    if (!result.success) {
      log.warn('Booking confirmation rejected', {
        userId: user.id,
        bookingId: id,
        code: result.code,
      });
      log.done(400);
      return businessErrorResponse(result.code, result.message);
    }

    log.info('Booking confirmed', { userId: user.id, bookingId: id });
    metricSuccess('booking.confirm', Date.now() - startMs);

    // Send confirmation email (fire-and-forget)
    (async () => {
      try {
        const db = getDb();
        const booking = await db.query.bookings.findFirst({
          where: eq(bookings.id, id),
        });
        if (!booking) return;

        const [listing, bookingUser] = await Promise.all([
          db.query.listings.findFirst({ where: eq(listings.id, booking.listingId) }),
          db.query.users.findFirst({ where: eq(users.id, booking.userId) }),
        ]);
        if (!listing || !bookingUser) return;

        const { sendBookingConfirmation } = await import('@/lib/services/email');
        await sendBookingConfirmation(
          {
            id: booking.id,
            listingId: booking.listingId,
            userId: booking.userId,
            startDate: String(booking.startDate),
            endDate: String(booking.endDate),
            guests: booking.guests,
            totalPrice: Number(booking.totalPrice),
            status: booking.status,
            createdAt: booking.createdAt.toISOString(),
          },
          { title: listing.title },
          bookingUser.email,
        );
      } catch (emailErr) {
        log.error('Failed to send booking confirmation email', { error: String(emailErr) });
      }
    })();

    log.done(200);
    return successResponse({ confirmed: true });
  } catch (error) {
    metricFailure('booking.confirm', Date.now() - startMs);
    captureError(error, { requestId, route: 'POST /api/bookings/:id/confirm' });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to confirm booking' }, 500);
  }
}
