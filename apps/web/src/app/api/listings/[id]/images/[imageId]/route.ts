import { NextRequest, NextResponse } from 'next/server';

import { getDb, listingImages, listings } from '@lumina/db';
import { eq, and } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { deleteObject } from '@/lib/services/upload';

async function verifyHostOwnership(listingId: string, userId: string) {
  const db = getDb();
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.hostId, userId)),
  });
  return listing;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const { id, imageId } = await params;

    const listing = await verifyHostOwnership(id, user.id);
    if (!listing) {
      return errorResponse({ code: 'FORBIDDEN', message: 'Not your listing' }, 403);
    }

    const db = getDb();

    // Fetch the image to get storageKey before deleting
    const image = await db.query.listingImages.findFirst({
      where: and(eq(listingImages.id, imageId), eq(listingImages.listingId, id)),
    });

    if (!image) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Image not found' }, 404);
    }

    // Delete from storage if storageKey exists
    if (image.storageKey) {
      await deleteObject(image.storageKey);
    }

    await db
      .delete(listingImages)
      .where(and(eq(listingImages.id, imageId), eq(listingImages.listingId, id)));

    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to delete image' }, 500);
  }
}
