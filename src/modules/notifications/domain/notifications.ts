import type { Prisma } from "@/generated/prisma/client";
import { Role, SubscriptionStatus } from "@/generated/prisma/enums";
import { isUserCurrentlySuspended } from "@/modules/users/domain/user-suspension";

export const MAX_NOTIFICATION_RECIPIENTS = 10_000;
export const NOTIFICATION_PAGE_SIZE = 20;
export const NOTIFICATION_PREVIEW_SIZE = 6;
export const NOTIFICATION_PREVIEW_EXCERPT_CHARACTERS = 160;
export const RENEWAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
export const notificationTypeLabels = {
  GENERAL_ALERT: "Alerta general",
  IMPORTANT_NOTICE: "Aviso importante",
  SUBSCRIPTION_RENEWAL: "Recordatorio de renovación",
} as const;

export const eligibleUserSelect = {
  id: true, name: true, email: true, role: true, deletedAt: true,
  emailVerified: true, suspendedAt: true, suspensionExpiresAt: true,
  adminCreatedAt: true, passwordChangeRequired: true, ageVerifiedAt: true,
  termsAcceptedAt: true, privacyAcceptedAt: true,
} satisfies Prisma.UserSelect;
export type NotificationUser = Prisma.UserGetPayload<{ select: typeof eligibleUserSelect }>;

export function isNotificationUserEligible(user: NotificationUser, now = new Date()) {
  return !user.deletedAt && user.emailVerified && !isUserCurrentlySuspended(user, now)
    && !(user.adminCreatedAt && (user.passwordChangeRequired || !user.ageVerifiedAt
      || !user.termsAcceptedAt || !user.privacyAcceptedAt));
}

export function eligibleUserWhere(now = new Date()): Prisma.UserWhereInput {
  return {
    deletedAt: null, emailVerified: true,
    AND: [
      { OR: [{ suspendedAt: null }, { suspensionExpiresAt: { lte: now } }] },
      { OR: [
        { adminCreatedAt: null },
        { passwordChangeRequired: false, ageVerifiedAt: { not: null }, termsAcceptedAt: { not: null }, privacyAcceptedAt: { not: null } },
      ] },
    ],
  };
}

export function renewalWhere(now = new Date()): Prisma.SubscriptionWhereInput {
  return {
    user: eligibleUserWhere(now),
    status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELED] },
    currentPeriodEnd: { lte: new Date(now.getTime() + RENEWAL_WINDOW_MS) },
    level: { isActive: true, requiresSubscription: true },
    payments: { some: { status: "SUCCEEDED", appliedAt: { not: null } } },
    OR: [
      { product: "STUDENT_PREMIUM", user: { role: Role.STUDENT } },
      { product: "TEACHER_PREMIUM", user: { role: Role.TEACHER } },
    ],
  };
}

export function reminderKey(subscriptionId: string, end: Date) {
  return `${subscriptionId}:${end.toISOString()}`;
}

export function notificationPage(value: unknown) {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(n) && n > 0 ? n : 1;
}

export function notificationDate(value: Date | string) {
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Costa_Rica" }).format(new Date(value));
}

export function notificationPreviewExcerpt(body: string) {
  const compact = body.replace(/\s+/g, " ").trim();
  const characters = Array.from(compact);
  return characters.length <= NOTIFICATION_PREVIEW_EXCERPT_CHARACTERS
    ? compact
    : `${characters.slice(0, NOTIFICATION_PREVIEW_EXCERPT_CHARACTERS).join("")}…`;
}
