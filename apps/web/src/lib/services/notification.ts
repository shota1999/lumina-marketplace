import { eq, and, desc, sql, isNull } from 'drizzle-orm';

import { getDb, notifications } from '@lumina/db';
import type { Notification, NotificationType } from '@lumina/shared';

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const db = getDb();

  await db.insert(notifications).values({
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    data: params.data ?? {},
    sentAt: new Date(),
  });
}

export async function getUserNotifications(
  userId: string,
  limit = 50,
): Promise<Notification[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    body: row.body,
    data: (row.data as Record<string, unknown>) ?? {},
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  const db = getDb();

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    );

  return result[0]?.count ?? 0;
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  const db = getDb();

  const result = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id });

  if (result.length === 0) {
    throw new Error('Notification not found or already read');
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  const db = getDb();

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        isNull(notifications.readAt),
      ),
    );
}
