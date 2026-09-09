import { NextResponse } from "next/server";
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
  const unreadCount = await prisma.notificationRecipient.count({
    where: {
      userId: viewer.user.id,
      readAt: null,
      receivedAt: { lte: new Date() },
    },
  });
  return NextResponse.json({ unreadCount }, { headers });
}
