import { NextRequest } from 'next/server';

import { getDb, notifications } from '@lumina/db';
import { eq, and } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id } = await params;
    const db = getDb();

    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse(
      { code: 'INTERNAL_ERROR', message: 'Failed to mark notification as read' },
      500,
    );
  }
}
