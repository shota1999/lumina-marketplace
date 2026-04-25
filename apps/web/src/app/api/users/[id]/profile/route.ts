import { eq, desc, sql, count } from 'drizzle-orm';
import { NextRequest } from 'next/server';

import { getDb, users, reviews, listings } from '@lumina/db';

import { errorResponse, successResponse } from '@/lib/api-response';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = getDb();

    // Fetch user (public fields only)
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return errorResponse({ code: 'NOT_FOUND', message: 'User not found' }, 404);
    }

    // Count reviews written by this user
    const [reviewCountResult] = await db
      .select({ value: count() })
      .from(reviews)
      .where(eq(reviews.userId, id));
    const reviewsGivenCount = reviewCountResult?.value ?? 0;

    // Host-specific stats
    let listingsCount = 0;
    let averageRating = 0;

    if (user.role === 'host') {
      const [listingCountResult] = await db
        .select({ value: count() })
        .from(listings)
        .where(eq(listings.hostId, id));
      listingsCount = listingCountResult?.value ?? 0;

      const [avgResult] = await db
        .select({ avg: sql<string>`coalesce(avg(${listings.rating}), 0)` })
        .from(listings)
        .where(eq(listings.hostId, id));
      averageRating = parseFloat(avgResult?.avg ?? '0');
    }

    // Recent reviews written by this user (last 5) with listing title
    const recentReviews = await db
      .select({
        id: reviews.id,
        listingId: reviews.listingId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        listingTitle: listings.title,
      })
      .from(reviews)
      .innerJoin(listings, eq(reviews.listingId, listings.id))
      .where(eq(reviews.userId, id))
      .orderBy(desc(reviews.createdAt))
      .limit(5);

    return successResponse({
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt.toISOString(),
      },
      stats: {
        reviewsGivenCount,
        ...(user.role === 'host' && { listingsCount, averageRating }),
      },
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        listingId: r.listingId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        listingTitle: r.listingTitle,
      })),
    });
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch user profile' }, 500);
  }
}
