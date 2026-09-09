import {
  NOTIFICATION_PREVIEW_SIZE,
  notificationTypeLabels,
} from "@/modules/notifications/domain/notifications";

export type NotificationPreviewItem = {
  id: string;
  type: keyof typeof notificationTypeLabels;
  title: string;
  excerpt: string;
  receivedAt: string;
  readAt: string | null;
  levelNumber: number | null;
};

export type NotificationPreviewPayload = {
  unreadCount: number;
  items: NotificationPreviewItem[];
};

export type NotificationPanelMode = "desktop" | "mobile";

export function notificationPanelModeForViewport(isMobile: boolean): NotificationPanelMode {
  return isMobile ? "mobile" : "desktop";
}

export function parseNotificationPreviewPayload(value: unknown): NotificationPreviewPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (
    !Number.isSafeInteger(payload.unreadCount) ||
    (payload.unreadCount as number) < 0 ||
    !Array.isArray(payload.items) ||
    payload.items.length > NOTIFICATION_PREVIEW_SIZE
  ) {
    return null;
  }

  const items: NotificationPreviewItem[] = [];
  for (const entry of payload.items) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      !item.id ||
      item.id.length > 128 ||
      typeof item.type !== "string" ||
      !Object.hasOwn(notificationTypeLabels, item.type) ||
      typeof item.title !== "string" ||
      item.title.length > 150 ||
      typeof item.excerpt !== "string" ||
      Array.from(item.excerpt).length > 161 ||
      typeof item.receivedAt !== "string" ||
      Number.isNaN(Date.parse(item.receivedAt)) ||
      !(item.readAt === null ||
        (typeof item.readAt === "string" && !Number.isNaN(Date.parse(item.readAt)))) ||
      !(item.levelNumber === null ||
        (typeof item.levelNumber === "number" && Number.isSafeInteger(item.levelNumber)))
    ) {
      return null;
    }

    items.push({
      id: item.id,
      type: item.type as NotificationPreviewItem["type"],
      title: item.title,
      excerpt: item.excerpt,
      receivedAt: item.receivedAt,
      readAt: item.readAt as string | null,
      levelNumber: item.levelNumber as number | null,
    });
  }

  return { unreadCount: payload.unreadCount as number, items };
}
