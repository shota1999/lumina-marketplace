import { NextRequest, NextResponse } from 'next/server';

import { getDb, listingImages, listings } from '@lumina/db';
import { eq, and } from 'drizzle-orm';
import { reorderImagesSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

async function verifyHostOwnership(listingId: string, userId: string) {
  const db = getDb();
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.hostId, userId)),
  });
  return listing;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const { id } = await params;

    const listing = await verifyHostOwnership(id, user.id);
    if (!listing) {
      return errorResponse({ code: 'FORBIDDEN', message: 'Not your listing' }, 403);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = reorderImagesSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const db = getDb();

    // Update sortOrder for each image based on array index
    const updates = parsed.data.imageIds.map((imageId, index) =>
      db
        .update(listingImages)
        .set({ sortOrder: index })
        .where(and(eq(listingImages.id, imageId), eq(listingImages.listingId, id))),
    );

    await Promise.all(updates);

    return successResponse({ reordered: true });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to reorder images' }, 500);
  }
}
