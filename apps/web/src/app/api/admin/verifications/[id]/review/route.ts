import { NextRequest, NextResponse } from 'next/server';

import { reviewVerificationSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { reviewVerification } from '@/lib/services/verification';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Admin access required' }, 401);
    }

    const { id } = await params;

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = reviewVerificationSchema.safeParse({
      ...(bodyResult.data as Record<string, unknown>),
      verificationId: id,
    });
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    await reviewVerification(id, user.id, parsed.data.status, parsed.data.adminNotes);

    return successResponse({ reviewed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to review verification';
    return errorResponse({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
