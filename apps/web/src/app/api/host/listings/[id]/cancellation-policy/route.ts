import { NextRequest, NextResponse } from 'next/server';

import { getDb, cancellationPolicies, listings } from '@lumina/db';
import { eq, and } from 'drizzle-orm';
import { CANCELLATION_POLICIES } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

async function verifyHostOwnership(listingId: string, userId: string) {
  const db = getDb();
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.hostId, userId)),
  });
  return listing;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = bodyResult.data as { type?: string };
    const policyType = body.type;

    if (!policyType || !['flexible', 'moderate', 'strict'].includes(policyType)) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: 'type must be flexible, moderate, or strict' },
        400,
      );
    }

    const typedPolicyType = policyType as 'flexible' | 'moderate' | 'strict';
    const policyRules = CANCELLATION_POLICIES[typedPolicyType].rules;

    const db = getDb();

    // Upsert cancellation policy
    await db
      .insert(cancellationPolicies)
      .values({
        listingId: id,
        type: typedPolicyType,
        rules: policyRules,
      })
      .onConflictDoUpdate({
        target: [cancellationPolicies.listingId],
        set: {
          type: typedPolicyType,
          rules: policyRules,
          updatedAt: new Date(),
        },
      });

    // Update listing's cancellationPolicyType
    await db
      .update(listings)
      .set({
        cancellationPolicyType: typedPolicyType,
        updatedAt: new Date(),
      })
      .where(eq(listings.id, id));

    return successResponse({ listingId: id, type: typedPolicyType, rules: policyRules });
  } catch (error) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to update cancellation policy' },
      500,
    );
  }
}
