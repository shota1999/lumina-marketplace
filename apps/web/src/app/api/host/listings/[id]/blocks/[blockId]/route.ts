import { NextRequest } from 'next/server';

import { getDb, availabilityBlocks, listings } from '@lumina/db';
import { eq, and } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id, blockId } = await params;
    const db = getDb();

    // Verify host owns the listing
    const listing = await db.query.listings.findFirst({
      where: and(eq(listings.id, id), eq(listings.hostId, user.id)),
    });

    if (!listing) {
      return errorResponse({ code: 'FORBIDDEN', message: 'Not your listing' }, 403);
    }

    await db
      .delete(availabilityBlocks)
      .where(and(eq(availabilityBlocks.id, blockId), eq(availabilityBlocks.listingId, id)));

    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to remove block' }, 500);
  }
}
