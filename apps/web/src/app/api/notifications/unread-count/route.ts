import { getDb, notifications } from '@lumina/db';
import { eq, isNull, and, sql } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const db = getDb();

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, user.id),
          isNull(notifications.readAt),
        ),
      );

    return successResponse({ count: Number(result[0]?.count ?? 0) });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to get unread count' }, 500);
  }
}
