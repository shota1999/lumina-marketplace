import { eq, and } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { getDb, reviews, reviewResponses, listings } from '@lumina/db';
import { createReviewResponseSchema, updateReviewResponseSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { captureError } from '@/lib/error-capture';
import { createRequestLogger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/reviews/:id/response – Host replies to a review.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/reviews/:id/response' });

  try {
    const user = await getCurrentUser();
    if (!user) {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in to respond' }, 401);
    }

    const { id: reviewId } = await params;
    const db = getDb();

    // Verify review exists and current user is the host of the listing
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
      with: { listing: true },
    });

    if (!review) {
      log.done(404);
      return errorResponse({ code: 'NOT_FOUND', message: 'Review not found' }, 404);
    }

    if (review.listing.hostId !== user.id) {
      log.done(403);
      return errorResponse(
        { code: 'FORBIDDEN', message: 'Only the listing host can respond to this review' },
        403,
      );
    }

    // Check if a response already exists
    const existing = await db.query.reviewResponses.findFirst({
      where: eq(reviewResponses.reviewId, reviewId),
    });
    if (existing) {
      log.done(409);
      return errorResponse(
        { code: 'DUPLICATE', message: 'A response already exists for this review' },
        409,
      );
    }

    // Parse body – only need `body` field; reviewId comes from URL
    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      log.done(400);
      return bodyResult.error;
    }

    const parsed = createReviewResponseSchema.safeParse({
      ...(bodyResult.data as Record<string, unknown>),
      reviewId,
    });
    if (!parsed.success) {
      log.done(400);
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const [response] = await db
      .insert(reviewResponses)
      .values({ reviewId, hostId: user.id, body: parsed.data.body })
      .returning();

    log.info('Review response created', { reviewId, responseId: response!.id });
    log.done(201);

    return successResponse(response, 201);
  } catch (error) {
    captureError(error, { requestId, route: 'POST /api/reviews/:id/response' });
    log.done(500);
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to create review response' },
      500,
    );
  }
}

/**
 * PATCH /api/reviews/:id/response – Update existing response. Only the host who wrote it.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'PATCH /api/reviews/:id/response' });

  try {
    const user = await getCurrentUser();
    if (!user) {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in to update' }, 401);
    }

    const { id: reviewId } = await params;
    const db = getDb();

    const existing = await db.query.reviewResponses.findFirst({
      where: eq(reviewResponses.reviewId, reviewId),
    });

    if (!existing) {
      log.done(404);
      return errorResponse({ code: 'NOT_FOUND', message: 'Review response not found' }, 404);
    }

    if (existing.hostId !== user.id) {
      log.done(403);
      return errorResponse(
        { code: 'FORBIDDEN', message: 'Only the author can update this response' },
        403,
      );
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      log.done(400);
      return bodyResult.error;
    }

    const parsed = updateReviewResponseSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      log.done(400);
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const [updated] = await db
      .update(reviewResponses)
      .set({ body: parsed.data.body, updatedAt: new Date() })
      .where(and(eq(reviewResponses.reviewId, reviewId), eq(reviewResponses.hostId, user.id)))
      .returning();

    log.info('Review response updated', { reviewId, responseId: updated!.id });
    log.done(200);

    return successResponse(updated);
  } catch (error) {
    captureError(error, { requestId, route: 'PATCH /api/reviews/:id/response' });
    log.done(500);
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to update review response' },
      500,
    );
  }
}

/**
 * DELETE /api/reviews/:id/response – Delete response. Only the host who wrote it.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'DELETE /api/reviews/:id/response' });

  try {
    const user = await getCurrentUser();
    if (!user) {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in to delete' }, 401);
    }

    const { id: reviewId } = await params;
    const db = getDb();

    const existing = await db.query.reviewResponses.findFirst({
      where: eq(reviewResponses.reviewId, reviewId),
    });

    if (!existing) {
      log.done(404);
      return errorResponse({ code: 'NOT_FOUND', message: 'Review response not found' }, 404);
    }

    if (existing.hostId !== user.id) {
      log.done(403);
      return errorResponse(
        { code: 'FORBIDDEN', message: 'Only the author can delete this response' },
        403,
      );
    }

    await db
      .delete(reviewResponses)
      .where(and(eq(reviewResponses.reviewId, reviewId), eq(reviewResponses.hostId, user.id)));

    log.info('Review response deleted', { reviewId, responseId: existing.id });
    log.done(200);

    return successResponse({ deleted: true });
  } catch (error) {
    captureError(error, { requestId, route: 'DELETE /api/reviews/:id/response' });
    log.done(500);
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to delete review response' },
      500,
    );
  }
}
