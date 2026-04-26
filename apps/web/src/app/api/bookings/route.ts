import { NextRequest } from 'next/server';

import { createBookingSchema } from '@lumina/shared';
import { withSpan, SpanAttr } from '@lumina/telemetry';

import {
  businessErrorResponse,
  errorResponse,
  safeParseBody,
  successResponse,
} from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { captureError } from '@/lib/error-capture';
import { checkIdempotencyKey } from '@/lib/idempotency';
import { createRequestLogger } from '@/lib/logger';
import { metricSuccess, metricFailure } from '@/lib/metrics';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { createBooking } from '@/lib/services/booking';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startMs = Date.now();
  const log = createRequestLogger({ requestId, route: 'POST /api/bookings' });

  try {
    const user = await getCurrentUser();
    if (!user) {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in to book' }, 401);
    }

    // Idempotency: prevent duplicate booking creation from retried requests
    const idempotencyKey = request.headers.get('idempotency-key');
    if (idempotencyKey) {
      const isNew = await checkIdempotencyKey(idempotencyKey);
      if (!isNew) {
        log.warn('Duplicate request blocked', { userId: user.id, idempotencyKey });
        log.done(409);
        return errorResponse(
          { code: 'IDEMPOTENT_REJECT', message: 'Duplicate request — booking already submitted' },
          409,
        );
      }
    }

    const rl = await checkRateLimit(request, 'bookings:create', RATE_LIMITS.bookingCreate);
    if (!rl.allowed) {
      log.warn('Rate limited', { userId: user.id });
      log.done(429);
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
        429,
      );
    }

    log.info('Booking attempt', { userId: user.id });

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      log.done(400);
      return bodyResult.error;
    }
    const parsed = createBookingSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      log.done(400);
      return businessErrorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid input',
      );
    }

    const result = await withSpan(
      'booking.create',
      {
        [SpanAttr.USER_ID]: user.id,
        [SpanAttr.BOOKING_LISTING_ID]: parsed.data.listingId,
      },
      () => createBooking({ ...parsed.data, userId: user.id, requestId, log }),
    );

    if (!result.success) {
      log.warn('Booking rejected', { userId: user.id, code: result.code });
      log.done(409);
      return businessErrorResponse(result.code, result.message);
    }

    log.info('Booking created', {
      userId: user.id,
      bookingId: result.booking.id,
      listingId: result.booking.listingId,
      nights: result.booking.nights,
      totalPrice: result.booking.totalPrice,
    });

    metricSuccess('booking.create', Date.now() - startMs);
    log.done(201);
    return successResponse(result.booking, 201);
  } catch (error) {
    metricFailure('booking.create', Date.now() - startMs);
    captureError(error, { requestId, route: 'POST /api/bookings' });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create booking' }, 500);
  }
}
