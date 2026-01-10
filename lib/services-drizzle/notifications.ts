import { db } from '@/lib/db';
import {
  approvalNotifications,
  users,
  type ApprovalNotification,
} from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';

export type NotificationWithUser = ApprovalNotification & {
  userName: string | null;
  userEmail: string;
  userOrganization: string | null;
};

/**
 * Get notifications for the current user
 */
export async function getNotificationsForUser(
  unreadOnly: boolean = false
): Promise<NotificationWithUser[]> {
  const currentUser = await requireAuth();

  const conditions = [eq(approvalNotifications.recipientId, currentUser.id)];

  if (unreadOnly) {
    conditions.push(eq(approvalNotifications.read, false));
  }

  const notifications = await db
    .select({
      id: approvalNotifications.id,
      userId: approvalNotifications.userId,
      recipientId: approvalNotifications.recipientId,
      type: approvalNotifications.type,
      read: approvalNotifications.read,
      createdAt: approvalNotifications.createdAt,
      userName: users.name,
      userEmail: users.email,
      userOrganization: users.organizationName,
    })
    .from(approvalNotifications)
    .innerJoin(users, eq(approvalNotifications.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(approvalNotifications.createdAt));

  return notifications;
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const currentUser = await requireAuth();

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(approvalNotifications)
    .where(
      and(
        eq(approvalNotifications.recipientId, currentUser.id),
        eq(approvalNotifications.read, false)
      )
    );

  return Number(result[0]?.count || 0);
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const currentUser = await requireAuth();

  const notification = await db.query.approvalNotifications.findFirst({
    where: eq(approvalNotifications.id, notificationId),
  });

  if (!notification) {
    throw new Error('Notification not found');
  }

  if (notification.recipientId !== currentUser.id) {
    throw new Error('Unauthorized: Cannot mark notification as read');
  }

  await db
    .update(approvalNotifications)
    .set({ read: true })
    .where(eq(approvalNotifications.id, notificationId));
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  const currentUser = await requireAuth();

  await db
    .update(approvalNotifications)
    .set({ read: true })
    .where(
      and(
        eq(approvalNotifications.recipientId, currentUser.id),
        eq(approvalNotifications.read, false)
      )
    );
}

/**
 * Create a notification
 */
export async function createNotification(
  userId: string,
  recipientId: string,
  type: string
): Promise<ApprovalNotification> {
  const [notification] = await db
    .insert(approvalNotifications)
    .values({
      userId,
      recipientId,
      type,
    })
    .returning();

  return notification;
}
