import { NextRequest, NextResponse } from 'next/server';

import { getDb, cancellationPolicies, listings } from '@lumina/db';
import { eq } from 'drizzle-orm';
import { CANCELLATION_POLICIES } from '@lumina/shared';

import { errorResponse, successResponse } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const policy = await db.query.cancellationPolicies.findFirst({
      where: eq(cancellationPolicies.listingId, id),
    });

    if (policy) {
      return successResponse({
        listingId: id,
        type: policy.type,
        rules: policy.rules,
      });
    }

    // Return default flexible policy
    return successResponse({
      listingId: id,
      type: 'flexible',
      rules: CANCELLATION_POLICIES.flexible.rules,
    });
  } catch (error) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch cancellation policy' },
      500,
    );
  }
}
