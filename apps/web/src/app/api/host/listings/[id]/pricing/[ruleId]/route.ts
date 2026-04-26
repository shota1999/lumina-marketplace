import { NextRequest, NextResponse } from 'next/server';

import { getDb, pricingRules, listings } from '@lumina/db';
import { eq, and } from 'drizzle-orm';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

async function verifyHostOwnership(listingId: string, userId: string) {
  const db = getDb();
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.hostId, userId)),
  });
  return listing;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const { id, ruleId } = await params;

    const listing = await verifyHostOwnership(id, user.id);
    if (!listing) {
      return errorResponse({ code: 'FORBIDDEN', message: 'Not your listing' }, 403);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const body = bodyResult.data as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.adjustment !== undefined) updates.adjustment = String(body.adjustment);
    if (body.adjustmentType !== undefined) updates.adjustmentType = body.adjustmentType;
    if (body.config !== undefined) updates.config = body.config;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    const db = getDb();
    const [updated] = await db
      .update(pricingRules)
      .set(updates)
      .where(and(eq(pricingRules.id, ruleId), eq(pricingRules.listingId, id)))
      .returning();

    if (!updated) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Pricing rule not found' }, 404);
    }

    return successResponse(updated);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to update pricing rule' }, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ruleId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'host' && user.role !== 'admin')) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Host access required' }, 401);
    }

    const { id, ruleId } = await params;

    const listing = await verifyHostOwnership(id, user.id);
    if (!listing) {
      return errorResponse({ code: 'FORBIDDEN', message: 'Not your listing' }, 403);
    }

    const db = getDb();
    await db
      .delete(pricingRules)
      .where(and(eq(pricingRules.id, ruleId), eq(pricingRules.listingId, id)));

    return successResponse({ deleted: true });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to delete pricing rule' }, 500);
  }
}
