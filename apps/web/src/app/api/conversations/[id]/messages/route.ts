import { NextRequest } from 'next/server';

import { getDb, conversations, listings, messages, users } from '@lumina/db';
import { eq, and, or } from 'drizzle-orm';
import { z } from 'zod';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000),
});

export async function POST(
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

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = sendMessageSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: id,
        senderId: user.id,
        body: parsed.data.content,
      })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, id));

    // Notify the other participant via email (fire-and-forget)
    const recipientId = conversation.hostId === user.id ? conversation.guestId : conversation.hostId;
    (async () => {
      try {
        const [recipient, listing] = await Promise.all([
          db.query.users.findFirst({ where: eq(users.id, recipientId) }),
          db.query.listings.findFirst({ where: eq(listings.id, conversation.listingId) }),
        ]);
        if (!recipient || !listing) return;

        const { sendNewMessageNotification } = await import('@/lib/services/email');
        await sendNewMessageNotification(recipient.email, user.name, listing.title, id);
      } catch {
        // Email failures should not affect the response
      }
    })();

    return successResponse(
      {
        id: msg!.id,
        content: msg!.body,
        senderId: msg!.senderId,
        createdAt: msg!.createdAt,
      },
      201,
    );
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to send message' }, 500);
  }
}
