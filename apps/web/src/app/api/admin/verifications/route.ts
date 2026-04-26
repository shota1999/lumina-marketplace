import { NextRequest, NextResponse } from 'next/server';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';
import { getPendingVerifications } from '@/lib/services/verification';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Admin access required' }, 401);
    }

    const verifications = await getPendingVerifications();

    return successResponse(verifications);
  } catch (error) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to fetch pending verifications' },
      500,
    );
  }
}
