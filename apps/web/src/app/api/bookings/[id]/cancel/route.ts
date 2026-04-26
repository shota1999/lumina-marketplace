import { NextRequest } from 'next/server';

import { withSpan, SpanAttr } from '@lumina/telemetry';

import { businessErrorResponse, errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { captureError } from '@/lib/error-capture';
import { createRequestLogger } from '@/lib/logger';
import { metricSuccess, metricFailure } from '@/lib/metrics';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { cancelBooking } from '@/lib/services/booking';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const startMs = Date.now();
  const log = createRequestLogger({ requestId, route: 'POST /api/bookings/:id/cancel' });

  try {
    const user = await getCurrentUser();
    if (!user) {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in to cancel' }, 401);
    }

    const rl = await checkRateLimit(request, 'bookings:cancel', RATE_LIMITS.bookingConfirm);
    if (!rl.allowed) {
      log.warn('Rate limited', { userId: user.id });
      log.done(429);
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
        429,
      );
    }

    const { id } = await params;
    log.info('Booking cancellation attempt', { userId: user.id, bookingId: id });

    const result = await withSpan(
      'booking.cancel',
      {
        [SpanAttr.BOOKING_ID]: id,
        [SpanAttr.USER_ID]: user.id,
      },
      () => cancelBooking(id, user.id, { requestId, log }),
    );

    if (!result.success) {
      log.warn('Booking cancellation rejected', {
        userId: user.id,
        bookingId: id,
        code: result.code,
      });
      log.done(400);
      return businessErrorResponse(result.code, result.message);
    }

    log.info('Booking cancelled', { userId: user.id, bookingId: id });
    metricSuccess('booking.cancel', Date.now() - startMs);
    log.done(200);
    return successResponse({ cancelled: true });
  } catch (error) {
    metricFailure('booking.cancel', Date.now() - startMs);
    captureError(error, { requestId, route: 'POST /api/bookings/:id/cancel' });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to cancel booking' }, 500);
  }
}
