import { NextRequest, NextResponse } from 'next/server';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { getVerificationStatus } from '@/lib/services/verification';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const verification = await getVerificationStatus(user.id);

    return successResponse(verification);
  } catch (error) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch verification status' },
      500,
    );
  }
}
