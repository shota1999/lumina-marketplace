import { NextRequest } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Not signed in' }, 401);
    }
    return successResponse(user);
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to get user' }, 500);
  }
}
