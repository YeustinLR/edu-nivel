import "server-only";

import {
  eligibleUserSelect,
  isNotificationUserEligible,
  type NotificationUser,
} from "@/modules/notifications/domain/notifications";
import { getCurrentSession } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

type NotificationApiViewer =
  | { user: NotificationUser }
  | { error: "UNAUTHORIZED"; status: 401 }
  | { error: "FORBIDDEN"; status: 403 };

export async function getNotificationApiViewer(): Promise<NotificationApiViewer> {
  const session = await getCurrentSession();
  if (!session?.user) return { error: "UNAUTHORIZED", status: 401 };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: eligibleUserSelect,
  });
  if (!user || !isNotificationUserEligible(user)) {
    return { error: "FORBIDDEN", status: 403 };
  }

  return { user };
}
