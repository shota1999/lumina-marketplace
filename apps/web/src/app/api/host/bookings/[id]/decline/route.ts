import { eq } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { bookings, getDb, listings } from '@lumina/db';
import { withSpan, SpanAttr } from '@lumina/telemetry';

import { errorResponse, successResponse } from '@/lib/api-response';
import { audit } from '@/lib/audit';
import { getCurrentUser } from '@/lib/auth';
import { blockDemoMutation } from '@/lib/demo-guard';
import { createRequestLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/host/bookings/:id/decline' });

  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }
    const blocked = blockDemoMutation(user);
    if (blocked) return blocked;

    const { id } = await params;

    return withSpan(
      'host.booking.decline',
      { [SpanAttr.BOOKING_ID]: id, [SpanAttr.USER_ID]: user.id },
      async () => {
        const db = getDb();
        const booking = await db
          .select({
            id: bookings.id,
            status: bookings.status,
            hostId: listings.hostId,
          })
          .from(bookings)
          .innerJoin(listings, eq(listings.id, bookings.listingId))
          .where(eq(bookings.id, id))
          .limit(1);

        const row = booking[0];
        if (!row) {
          log.done(404);
          return errorResponse({ code: 'NOT_FOUND', message: 'Booking not found' }, 404);
        }
        if (row.hostId !== user.id && user.role !== 'admin') {
          log.done(403);
          return errorResponse({ code: 'FORBIDDEN', message: 'Not your listing' }, 403);
        }
        if (row.status === 'cancelled') {
          log.done(200);
          return successResponse({ declined: true, alreadyCancelled: true });
        }
        if (row.status !== 'pending') {
          log.done(400);
          return errorResponse(
            {
              code: 'INVALID_STATUS',
              message: `Cannot decline a booking with status "${row.status}"`,
            },
            400,
          );
        }

        await db.update(bookings).set({ status: 'cancelled' }).where(eq(bookings.id, id));
        audit({
          action: 'booking.declined_by_host',
          userId: user.id,
          resourceId: id,
          requestId,
        });
        log.info('Host declined booking', { hostId: user.id, bookingId: id });
        log.done(200);
        return successResponse({ declined: true });
      },
    );
  } catch (error) {
    log.error('Decline failed', { error: String(error) });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to decline booking' }, 500);
  }
}
