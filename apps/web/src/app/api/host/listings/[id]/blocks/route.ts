import { NextRequest } from 'next/server';

import { getDb, availabilityBlocks, listings } from '@lumina/db';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

const createBlockSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
});

async function verifyHostOwnership(listingId: string, userId: string) {
  const db = getDb();
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.hostId, userId)),
  });
  return listing;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id } = await params;

    const listing = await verifyHostOwnership(id, user.id);
    if (!listing) {
      return errorResponse({ code: 'FORBIDDEN', message: 'Not your listing' }, 403);
    }

    const db = getDb();
    const blocks = await db
      .select()
      .from(availabilityBlocks)
      .where(eq(availabilityBlocks.listingId, id));

    return successResponse(blocks);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch blocks' }, 500);
  }
}

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

    const listing = await verifyHostOwnership(id, user.id);
    if (!listing) {
      return errorResponse({ code: 'FORBIDDEN', message: 'Not your listing' }, 403);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = createBlockSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const db = getDb();
    const [block] = await db
      .insert(availabilityBlocks)
      .values({
        listingId: id,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        reason: parsed.data.reason,
      })
      .returning();

    return successResponse(block, 201);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create block' }, 500);
  }
}
