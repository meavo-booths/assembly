"use server";

import type { NotificationFeed } from "@meavo/navigation";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@meavo/navigation/server";
import { getMeavoSession } from "@/lib/meavo-auth";
import { prisma } from "@/lib/prisma";

async function requireUserId(): Promise<string> {
  // Tool-card access is re-checked per request so gateway revocation applies
  // immediately. Throws (rather than redirecting) because these actions are
  // called from background nav polling.
  const session = await getMeavoSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function refreshNotificationsAction(): Promise<NotificationFeed> {
  const userId = await requireUserId();
  return getNotifications(prisma, { userId });
}

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const userId = await requireUserId();
  await markNotificationRead(prisma, { userId, notificationId });
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const userId = await requireUserId();
  await markAllNotificationsRead(prisma, { userId });
}
