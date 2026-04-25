import { NextRequest } from 'next/server';

import { getDb, conversations, messages } from '@lumina/db';
import { eq, and, or, ne } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const { id } = await params;
    const db = getDb();

    // Verify user is a participant
    const conversation = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, id),
        or(
          eq(conversations.hostId, user.id),
          eq(conversations.guestId, user.id),
        ),
      ),
    });

    if (!conversation) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Conversation not found' }, 404);
    }

    // Mark all messages from the other user as read
    await db
      .update(messages)
      .set({ status: 'read' })
      .where(
        and(
          eq(messages.conversationId, id),
          ne(messages.senderId, user.id),
        ),
      );

    return successResponse({ success: true });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to mark as read' }, 500);
  }
}
