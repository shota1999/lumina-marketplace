import { NextRequest, NextResponse } from 'next/server';

import { getDb, pricingRules, listings } from '@lumina/db';
import { eq, and } from 'drizzle-orm';
import { createPricingRuleSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

async function verifyHostOwnership(listingId: string, userId: string) {
  const db = getDb();
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.hostId, userId)),
  });
  return listing;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const db = getDb();
    const rules = await db.select().from(pricingRules).where(eq(pricingRules.listingId, id));

    return successResponse(rules);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch pricing rules' }, 500);
  }
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

    const parsed = createPricingRuleSchema.safeParse({
      ...(bodyResult.data as Record<string, unknown>),
      listingId: id,
    });
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const db = getDb();
    const [rule] = await db
      .insert(pricingRules)
      .values({
        listingId: id,
        type: parsed.data.type,
        name: parsed.data.name,
        adjustment: String(parsed.data.adjustment),
        adjustmentType: parsed.data.adjustmentType,
        config: parsed.data.config as Record<string, unknown>,
        priority: parsed.data.priority,
      })
      .returning();

    return successResponse(rule, 201);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create pricing rule' }, 500);
  }
}
