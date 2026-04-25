import { eq, and, or, desc, sql, ne } from 'drizzle-orm';

import { getDb, conversations, messages, listings, users } from '@lumina/db';
import type { Conversation, Message } from '@lumina/shared';

export async function getOrCreateConversation(
  listingId: string,
  guestId: string,
): Promise<{ conversationId: string; isNew: boolean }> {
  const db = getDb();

  // Check if conversation already exists for this listing+guest pair
  const existing = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.listingId, listingId),
      eq(conversations.guestId, guestId),
    ),
  });

  if (existing) {
    return { conversationId: existing.id, isNew: false };
  }

  // Look up listing to get hostId
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
    columns: { id: true, hostId: true },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  if (listing.hostId === guestId) {
    throw new Error('Host cannot start a conversation with themselves');
  }

  const [conversation] = await db
    .insert(conversations)
    .values({
      listingId,
      hostId: listing.hostId,
      guestId,
    })
    .returning();

  return { conversationId: conversation!.id, isNew: true };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
): Promise<Message> {
  const db = getDb();

  // Verify sender is a participant
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.hostId !== senderId && conversation.guestId !== senderId) {
    throw new Error('User is not a participant in this conversation');
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId,
      body,
      status: 'sent',
    })
    .returning();

  // Update conversation lastMessageAt
  await db
    .update(conversations)
    .set({ lastMessageAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return {
    id: message!.id,
    conversationId: message!.conversationId,
    senderId: message!.senderId,
    body: message!.body,
    status: message!.status,
    createdAt: message!.createdAt.toISOString(),
  };
}

export async function getConversations(
  userId: string,
): Promise<Conversation[]> {
  const db = getDb();

  const rows = await db.query.conversations.findMany({
    where: or(
      eq(conversations.hostId, userId),
      eq(conversations.guestId, userId),
    ),
    orderBy: [desc(conversations.lastMessageAt)],
    with: {
      listing: {
        columns: { title: true, slug: true },
      },
      host: {
        columns: { name: true, avatarUrl: true },
      },
      guest: {
        columns: { name: true, avatarUrl: true },
      },
      messages: {
        columns: { id: true, body: true, senderId: true, status: true },
        orderBy: [desc(messages.createdAt)],
        limit: 1,
      },
    },
  });

  // For unread counts, query separately
  const unreadCounts = await db
    .select({
      conversationId: messages.conversationId,
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .where(
      and(
        ne(messages.senderId, userId),
        ne(messages.status, 'read'),
      ),
    )
    .groupBy(messages.conversationId);

  const unreadMap = new Map(
    unreadCounts.map((r) => [r.conversationId, r.count]),
  );

  return rows.map((row) => {
    const otherUser = row.hostId === userId ? row.guest : row.host;
    return {
      id: row.id,
      listingId: row.listingId,
      hostId: row.hostId,
      guestId: row.guestId,
      lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      listing: {
        title: row.listing.title,
        slug: row.listing.slug,
      },
      otherUser: {
        name: otherUser.name,
        avatarUrl: otherUser.avatarUrl,
      },
      unreadCount: unreadMap.get(row.id) ?? 0,
    };
  });
}

export async function getMessages(
  conversationId: string,
  userId: string,
): Promise<Message[]> {
  const db = getDb();

  // Verify the user is a participant
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (conversation.hostId !== userId && conversation.guestId !== userId) {
    throw new Error('User is not a participant in this conversation');
  }

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function markAsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  const db = getDb();

  // Mark all unread messages not sent by the user as 'read'
  await db
    .update(messages)
    .set({ status: 'read' })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId),
        ne(messages.status, 'read'),
      ),
    );
}
