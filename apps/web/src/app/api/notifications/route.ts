import { NextRequest } from 'next/server';

import { getDb, notifications } from '@lumina/db';
import { eq, desc } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));

    const db = getDb();
    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return successResponse(result);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' }, 500);
  }
}
