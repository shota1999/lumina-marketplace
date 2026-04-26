import { eq, sql } from 'drizzle-orm';
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

import { getDb, reviews, listings, users } from '@lumina/db';
import { createReviewSchema } from '@lumina/shared';

import { audit } from '@/lib/audit';
import {
  businessErrorResponse,
  errorResponse,
  safeParseBody,
  successResponse,
} from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { captureError } from '@/lib/error-capture';
import { createRequestLogger } from '@/lib/logger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { stripHtml } from '@/lib/sanitize';

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const log = createRequestLogger({ requestId, route: 'POST /api/reviews' });

  try {
    const user = await getCurrentUser();
    if (!user) {
      log.done(401);
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in to leave a review' }, 401);
    }

    const rl = await checkRateLimit(request, 'reviews:create', RATE_LIMITS.reviewCreate);
    if (!rl.allowed) {
      log.warn('Rate limited', { userId: user.id });
      log.done(429);
      return errorResponse(
        { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
        429,
      );
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      log.done(400);
      return bodyResult.error;
    }
    const parsed = createReviewSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      log.done(400);
      return businessErrorResponse(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Invalid input',
      );
    }

    const { listingId, rating, comment: rawComment } = parsed.data;
    const comment = stripHtml(rawComment);
    const db = getDb();

    log.info('Review attempt', { userId: user.id, listingId, rating });

    // Verify listing exists
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });
    if (!listing) {
      log.done(404);
      return businessErrorResponse('NOT_FOUND', 'Listing not found');
    }

    // Check for existing review by this user on this listing
    const existing = await db.query.reviews.findFirst({
      where: (r, { and, eq: e }) => and(e(r.listingId, listingId), e(r.userId, user.id)),
    });
    if (existing) {
      log.done(409);
      return businessErrorResponse('DUPLICATE', 'You have already reviewed this listing');
    }

    // Create review
    const [review] = await db
      .insert(reviews)
      .values({ listingId, userId: user.id, rating, comment })
      .returning();

    // Update listing rating + review count (denormalized for performance)
    const [updatedListing] = await db
      .update(listings)
      .set({
        reviewCount: sql`(SELECT count(*) FROM reviews WHERE listing_id = ${listingId})::int`,
        rating: sql`(SELECT coalesce(avg(rating), 0) FROM reviews WHERE listing_id = ${listingId})`,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning({ slug: listings.slug });

    // Bust listing page cache
    if (updatedListing) {
      revalidateTag(`listing:${updatedListing.slug}`);
    }

    audit({
      action: 'review.created',
      userId: user.id,
      requestId,
      resourceId: review!.id,
      meta: { listingId, rating },
    });

    log.info('Review created', { userId: user.id, reviewId: review!.id, listingId, rating });

    // Notify host via email (fire-and-forget)
    (async () => {
      try {
        const host = await db.query.users.findFirst({
          where: eq(users.id, listing.hostId),
        });
        if (!host) return;

        const { sendNewReviewNotification } = await import('@/lib/services/email');
        await sendNewReviewNotification(host.email, listing.title, rating);
      } catch (emailErr) {
        log.error('Failed to send review notification email', { error: String(emailErr) });
      }
    })();

    log.done(201);

    return successResponse(
      {
        id: review!.id,
        listingId: review!.listingId,
        rating: review!.rating,
        comment: review!.comment,
        createdAt: review!.createdAt.toISOString(),
        author: { name: user.name, avatarUrl: user.avatarUrl },
      },
      201,
    );
  } catch (error) {
    captureError(error, { requestId, route: 'POST /api/reviews' });
    log.done(500);
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create review' }, 500);
  }
}
