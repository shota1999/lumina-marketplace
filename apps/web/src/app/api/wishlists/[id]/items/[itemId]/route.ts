import { NextRequest } from 'next/server';

import { getDb, wishlists, wishlistItems } from '@lumina/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

const updateItemNoteSchema = z.object({
  note: z.string().max(500).nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id, itemId } = await params;
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

    const parsed = updateItemNoteSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const [updated] = await db
      .update(wishlistItems)
      .set({ note: parsed.data.note })
      .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, id)))
      .returning();

    if (!updated) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Wishlist item not found' }, 404);
    }

    return successResponse(updated);
  } catch {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to update wishlist item' },
      500,
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id, itemId } = await params;
    const db = getDb();

    // Verify wishlist ownership
    const wishlist = await db.query.wishlists.findFirst({
      where: and(eq(wishlists.id, id), eq(wishlists.userId, user.id)),
    });

    if (!wishlist) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Wishlist not found' }, 404);
    }

    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.wishlistId, id)));

    return successResponse({ deleted: true });
  } catch {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to remove wishlist item' },
      500,
    );
  }
}
