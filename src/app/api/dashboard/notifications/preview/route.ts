import { NextResponse } from "next/server";

import {
  NOTIFICATION_PREVIEW_SIZE,
  notificationPreviewExcerpt,
} from "@/modules/notifications/domain/notifications";
import { prisma } from "@/server/db/prisma";
import { getNotificationApiViewer } from "@/server/notifications/api-viewer";

const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const viewer = await getNotificationApiViewer();
  if ("error" in viewer) {
    return NextResponse.json(
      { error: viewer.error },
      { status: viewer.status, headers },
    );
  }
  const { user } = viewer;
  const now = new Date();

  const [unreadCount, items] = await Promise.all([
    prisma.notificationRecipient.count({
      where: { userId: user.id, readAt: null, receivedAt: { lte: now } },
    }),
    prisma.notificationRecipient.findMany({
      where: { userId: user.id, receivedAt: { lte: now } },
      take: NOTIFICATION_PREVIEW_SIZE,
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        readAt: true,
        receivedAt: true,
        levelNumberSnapshot: true,
        notification: {
          select: { type: true, title: true, body: true },
        },
      },
    }),
  ]);

  return NextResponse.json(
    {
      unreadCount,
      items: items.map((item) => ({
        id: item.id,
        type: item.notification.type,
        title: item.notification.title,
        excerpt: notificationPreviewExcerpt(item.notification.body),
        receivedAt: item.receivedAt.toISOString(),
        readAt: item.readAt?.toISOString() ?? null,
        levelNumber: item.levelNumberSnapshot,
      })),
    },
    { headers },
  );
}
