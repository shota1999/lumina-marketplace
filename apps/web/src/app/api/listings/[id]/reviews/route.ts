import { eq, desc } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { getDb, reviews } from '@lumina/db';

import { errorResponse, successResponse } from '@/lib/api-response';
import { captureError } from '@/lib/error-capture';
import { createRequestLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/listings/:id/reviews – List reviews for a listing,
 * including user info and any host response.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'GET /api/listings/:id/reviews' });

  try {
    const { id } = await params;
    const db = getDb();

    const results = await db.query.reviews.findMany({
      where: eq(reviews.listingId, id),
      with: {
        user: true,
        response: {
          with: { host: true },
        },
      },
      orderBy: [desc(reviews.createdAt)],
    });

    log.info('Reviews fetched', { listingId: id, count: results.length });
    log.done(200);

    return successResponse(results);
  } catch (error) {
    captureError(error, { requestId, route: 'GET /api/listings/:id/reviews' });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch reviews' }, 500);
  }
}
