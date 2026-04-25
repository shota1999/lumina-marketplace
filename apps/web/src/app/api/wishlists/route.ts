import { NextRequest } from 'next/server';

import { getDb, wishlists, wishlistItems } from '@lumina/db';
import { eq, sql, desc } from 'drizzle-orm';
import { createWishlistSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const db = getDb();

    const userWishlists = await db
      .select({
        id: wishlists.id,
        name: wishlists.name,
        description: wishlists.description,
        isPublic: wishlists.isPublic,
        coverImageUrl: wishlists.coverImageUrl,
        createdAt: wishlists.createdAt,
        updatedAt: wishlists.updatedAt,
        itemCount: sql<number>`count(${wishlistItems.id})::int`,
      })
      .from(wishlists)
      .leftJoin(wishlistItems, eq(wishlists.id, wishlistItems.wishlistId))
      .where(eq(wishlists.userId, user.id))
      .groupBy(wishlists.id)
      .orderBy(desc(wishlists.createdAt));

    return successResponse(userWishlists);
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch wishlists' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = createWishlistSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const db = getDb();

    const [wishlist] = await db
      .insert(wishlists)
      .values({
        userId: user.id,
        name: parsed.data.name,
        description: parsed.data.description,
        isPublic: parsed.data.isPublic,
      })
      .returning();

    return successResponse(wishlist, 201);
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create wishlist' }, 500);
  }
}
