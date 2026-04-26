import { NextRequest, NextResponse } from 'next/server';

import { getDb, listingImages, listings } from '@lumina/db';
import { eq, and } from 'drizzle-orm';
import { registerImageSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

async function verifyHostOwnership(listingId: string, userId: string) {
  const db = getDb();
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.hostId, userId)),
  });
  return listing;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const parsed = registerImageSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const db = getDb();

    // If isPrimary, unset all other primary images for this listing
    if (parsed.data.isPrimary) {
      await db
        .update(listingImages)
        .set({ isPrimary: false })
        .where(eq(listingImages.listingId, id));
    }

    const [image] = await db
      .insert(listingImages)
      .values({
        listingId: id,
        url: parsed.data.url,
        storageKey: parsed.data.storageKey,
        alt: parsed.data.alt,
        width: parsed.data.width,
        height: parsed.data.height,
        isPrimary: parsed.data.isPrimary,
      })
      .returning();

    return successResponse(image, 201);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to register image' }, 500);
  }
}
