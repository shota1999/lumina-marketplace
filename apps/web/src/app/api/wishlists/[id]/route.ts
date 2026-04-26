import { NextRequest } from 'next/server';

import { getDb, wishlists } from '@lumina/db';
import { eq, and } from 'drizzle-orm';
import { updateWishlistSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id } = await params;
    const db = getDb();

    const wishlist = await db.query.wishlists.findFirst({
      where: and(eq(wishlists.id, id), eq(wishlists.userId, user.id)),
      with: {
        items: {
          with: {
            listing: {
              with: { images: true },
            },
          },
        },
      },
    });

    if (!wishlist) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Wishlist not found' }, 404);
    }

    // Shape items to include only the needed listing fields
    const shaped = {
      ...wishlist,
      items: wishlist.items.map((item) => ({
        id: item.id,
        listingId: item.listingId,
        note: item.note,
        createdAt: item.createdAt,
        listing: {
          id: item.listing.id,
          title: item.listing.title,
          slug: item.listing.slug,
          pricePerNight: item.listing.pricePerNight,
          city: item.listing.city,
          country: item.listing.country,
          images: item.listing.images,
        },
      })),
    };

    return successResponse(shaped);
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch wishlist' }, 500);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id } = await params;
    const db = getDb();

    // Verify ownership
    const existing = await db.query.wishlists.findFirst({
      where: and(eq(wishlists.id, id), eq(wishlists.userId, user.id)),
    });

    if (!existing) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Wishlist not found' }, 404);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = updateWishlistSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const [updated] = await db
      .update(wishlists)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(wishlists.id, id), eq(wishlists.userId, user.id)))
      .returning();

    return successResponse(updated);
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to update wishlist' }, 500);
  }
}

export async function DELETE(
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

    // Verify ownership
    const existing = await db.query.wishlists.findFirst({
      where: and(eq(wishlists.id, id), eq(wishlists.userId, user.id)),
    });

    if (!existing) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Wishlist not found' }, 404);
    }

    await db.delete(wishlists).where(and(eq(wishlists.id, id), eq(wishlists.userId, user.id)));

    return successResponse({ deleted: true });
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to delete wishlist' }, 500);
  }
}
