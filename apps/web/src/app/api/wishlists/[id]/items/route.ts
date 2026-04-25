import { NextRequest } from 'next/server';

import { getDb, wishlists, wishlistItems } from '@lumina/db';
import { eq, and } from 'drizzle-orm';
import { addToWishlistSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id } = await params;
    const db = getDb();

    // Verify wishlist ownership
    const wishlist = await db.query.wishlists.findFirst({
      where: and(eq(wishlists.id, id), eq(wishlists.userId, user.id)),
    });

    if (!wishlist) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Wishlist not found' }, 404);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = addToWishlistSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    // Check if item already exists in this wishlist
    const existing = await db.query.wishlistItems.findFirst({
      where: and(
        eq(wishlistItems.wishlistId, id),
        eq(wishlistItems.listingId, parsed.data.listingId),
      ),
    });

    if (existing) {
      return errorResponse({ code: 'DUPLICATE', message: 'Listing already in this wishlist' }, 409);
    }

    const [item] = await db
      .insert(wishlistItems)
      .values({
        wishlistId: id,
        listingId: parsed.data.listingId,
        note: parsed.data.note,
      })
      .returning();

    return successResponse(item, 201);
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to add item to wishlist' }, 500);
  }
}
