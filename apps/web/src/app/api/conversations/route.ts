import { NextRequest } from 'next/server';

import { createConversationSchema } from '@lumina/shared';
import { getDb, conversations, messages, listings } from '@lumina/db';
import { and, eq, ne, or, desc, sql } from 'drizzle-orm';

import { errorResponse, safeParseBody, successResponse } from '@/lib/api-response';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const db = getDb();
    const result = await db.query.conversations.findMany({
      where: or(
        eq(conversations.hostId, user.id),
        eq(conversations.guestId, user.id),
      ),
      with: {
        listing: true,
        host: true,
        guest: true,
        messages: {
          orderBy: [desc(messages.createdAt)],
          limit: 1,
        },
      },
      orderBy: [desc(conversations.lastMessageAt)],
    });

    const unreadCounts = await db
      .select({
        conversationId: messages.conversationId,
        count: sql<number>`count(*)::int`,
      })
      .from(messages)
      .where(
        and(
          ne(messages.senderId, user.id),
          ne(messages.status, 'read'),
        ),
      )
      .groupBy(messages.conversationId);

    const unreadByConversation = new Map(
      unreadCounts.map((row) => [row.conversationId, row.count]),
    );

    const shaped = result.map((c) => {
      const otherUser = c.hostId === user.id ? c.guest : c.host;
      const last = c.messages[0];
      return {
        id: c.id,
        otherUser: { id: otherUser.id, name: otherUser.name },
        listing: { id: c.listing.id, title: c.listing.title, slug: c.listing.slug },
        lastMessage: last
          ? {
              content: last.body,
              createdAt: last.createdAt,
              senderId: last.senderId,
            }
          : null,
        unreadCount: unreadByConversation.get(c.id) ?? 0,
      };
    });

    return successResponse(shaped);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to fetch conversations' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse({ code: 'UNAUTHORIZED', message: 'Sign in required' }, 401);
    }

    const bodyResult = await safeParseBody(request);
    if ('error' in bodyResult) {
      return bodyResult.error;
    }

    const parsed = createConversationSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
      return errorResponse(
        { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid input' },
        400,
      );
    }

    const { listingId, message } = parsed.data;
    const db = getDb();

    // Look up the host from the listing
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
      columns: { hostId: true },
    });
    if (!listing) {
      return errorResponse({ code: 'NOT_FOUND', message: 'Listing not found' }, 404);
    }
    const hostId = listing.hostId;

    // Check for existing conversation
    const existing = await db.query.conversations.findFirst({
      where: (c, { and, eq: e }) =>
        and(
          e(c.listingId, listingId),
          e(c.guestId, user.id),
          e(c.hostId, hostId),
        ),
    });

    let conversationId: string;

    if (existing) {
      conversationId = existing.id;
    } else {
      const [created] = await db
        .insert(conversations)
        .values({
          listingId,
          hostId,
          guestId: user.id,
          lastMessageAt: new Date(),
        })
        .returning();
      conversationId = created!.id;
    }

    // Send initial message
    const [msg] = await db
      .insert(messages)
      .values({
        conversationId,
        senderId: user.id,
        body: message,
      })
      .returning();

    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return successResponse({ conversationId, message: msg }, 201);
  } catch (error) {
    return errorResponse({ code: 'INTERNAL_ERROR', message: 'Failed to create conversation' }, 500);
  }
}
