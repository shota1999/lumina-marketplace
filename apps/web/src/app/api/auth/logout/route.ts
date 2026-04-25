import { NextRequest } from 'next/server';

import { successResponse, errorResponse } from '@/lib/api-response';
import { destroySession } from '@/lib/auth';

export async function POST(_request: NextRequest) {
  try {
    await destroySession();
    return successResponse({ loggedOut: true });
  } catch {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Logout failed' }, 500);
  }
}
