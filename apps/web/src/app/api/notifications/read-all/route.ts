import { getDb, notifications } from '@lumina/db';
import { eq, isNull } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const db = getDb();

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        eq(notifications.userId, user.id),
      );

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to mark all as read' }, 500);
  }
}
