import { NextRequest } from 'next/server';

import { getDb, conversations, messages } from '@lumina/db';
import { eq, and, or, asc } from 'drizzle-orm';

import { errorResponse, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        or(eq(conversations.hostId, user.id), eq(conversations.guestId, user.id)),
      ),
      with: {
        listing: true,
        host: true,
        guest: true,
      },
    });

    if (!conversation) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Conversation not found' }, 404);
    }

    const msgs = await db.query.messages.findMany({
      where: eq(messages.conversationId, id),
      orderBy: [asc(messages.createdAt)],
    });

    const otherUser = conversation.hostId === user.id ? conversation.guest : conversation.host;

    return successResponse({
      id: conversation.id,
      currentUserId: user.id,
      otherUser: { id: otherUser.id, name: otherUser.name },
      listing: {
        id: conversation.listing.id,
        title: conversation.listing.title,
        slug: conversation.listing.slug,
      },
      messages: msgs.map((m) => ({
        id: m.id,
        content: m.body,
        senderId: m.senderId,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch conversation' }, 500);
  }
}
