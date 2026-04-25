import { NextRequest, NextResponse } from 'next/server';

import { submitVerificationSchema } from '@lumina/shared';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { submitVerification } from '@/lib/services/verification';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = submitVerificationSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const verification = await submitVerification(user.id, {
      documentType: parsed.data.documentType,
      documentUrl: parsed.data.documentUrl,
      selfieUrl: parsed.data.selfieUrl,
    });

    return successResponse(verification, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit verification';
    return errorResponse({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
