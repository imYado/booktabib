import 'server-only'
import { and, count, desc, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/db'
import { notifications } from '@/db/schema'

export type Notification = typeof notifications.$inferSelect

export async function unreadCount(userId: string) {
  const db = await getDb()
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
  return row?.n ?? 0
}

/** The latest notifications for a user, newest first. */
export async function listNotifications(userId: string, limit = 50) {
  const db = await getDb()
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(limit)
}

export async function markAllRead(userId: string) {
  const db = await getDb()
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
}
