import { NextRequest } from 'next/server';

import { getDb, wishlists, wishlistItems } from '@lumina/db';
import { eq, and } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id: listingId } = await params;
    const db = getDb();

    // Find all wishlist items for this listing that belong to the user's wishlists
    const items = await db
      .select({ wishlistId: wishlistItems.wishlistId })
      .from(wishlistItems)
      .innerJoin(wishlists, eq(wishlistItems.wishlistId, wishlists.id))
      .where(and(eq(wishlistItems.listingId, listingId), eq(wishlists.userId, user.id)));

    const wishlistIds = items.map((item) => item.wishlistId);

    return successResponse(wishlistIds);
  } catch {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch listing wishlists' },
      500,
    );
  }
}
