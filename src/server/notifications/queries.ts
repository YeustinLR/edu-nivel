import "server-only";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { eligibleUserWhere, NOTIFICATION_PAGE_SIZE, notificationPage, notificationTypeLabels, reminderKey, renewalWhere } from "@/modules/notifications/domain/notifications";
import { requireRole, requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import { pendingPaymentExclusions, NotificationError } from "./send";

export type NotificationSearch = { page?: string; q?: string; role?: string; type?: string; unread?: string; userId?: string; subscriptionId?: string; senderId?: string };
export function normalizeNotificationSearch(raw: unknown): NotificationSearch {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const result: NotificationSearch = {};
  for (const key of ["page", "q", "role", "type", "unread", "userId", "subscriptionId", "senderId"] as const) {
    const value = input[key];
    if (typeof value === "string") result[key] = value.trim().slice(0, key === "q" ? 150 : 128);
  }
  return result;
}
function typeFilter(value?: string) {
  return value && Object.hasOwn(notificationTypeLabels, value) ? value as keyof typeof notificationTypeLabels : undefined;
}
export function roleFilter(value?: string) {
  return value && Object.values(Role).includes(value as Role) ? value as Role : undefined;
}
function searchUsers(query?: string): Prisma.UserWhereInput {
  const q = query?.trim().slice(0, 150);
  return q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {};
}
function paging(page: unknown, total: number) {
  const totalPages = Math.max(1, Math.ceil(total / NOTIFICATION_PAGE_SIZE));
  const currentPage = Math.min(notificationPage(page), totalPages);
  return { page: currentPage, totalPages, skip: (currentPage - 1) * NOTIFICATION_PAGE_SIZE };
}

export async function getNotificationCandidates(search: NotificationSearch) {
  await requireRole(Role.ADMIN);
  search = normalizeNotificationSearch(search);
  const where: Prisma.UserWhereInput = { AND: [eligibleUserWhere(), searchUsers(search.q)], role: roleFilter(search.role), id: search.userId || undefined };
  const total = await prisma.user.count({ where });
  const page = paging(search.page, total);
  const items = await prisma.user.findMany({ where, skip: page.skip, take: NOTIFICATION_PAGE_SIZE, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, email: true, role: true } });
  return { ...page, total, items };
}

export async function getRenewalCandidates(search: NotificationSearch) {
  await requireRole(Role.ADMIN);
  search = normalizeNotificationSearch(search);
  const where: Prisma.SubscriptionWhereInput = {
    AND: [renewalWhere(), await pendingPaymentExclusions(prisma)],
    user: { AND: [eligibleUserWhere(), searchUsers(search.q)], role: roleFilter(search.role) },
    id: search.subscriptionId || undefined,
  };
  const total = await prisma.subscription.count({ where });
  const page = paging(search.page, total);
  const items = await prisma.subscription.findMany({
    where, skip: page.skip, take: NOTIFICATION_PAGE_SIZE, orderBy: [{ currentPeriodEnd: "asc" }, { id: "asc" }],
    select: { id: true, currentPeriodEnd: true, user: { select: { name: true, email: true, role: true } }, level: { select: { levelNumber: true } }, notificationRecipients: { orderBy: [{ receivedAt: "desc" }, { id: "desc" }], take: 1, select: { id: true, notificationId: true, receivedAt: true } } },
  });
  const initial = await prisma.notificationRecipient.findMany({ where: { initialReminderKey: { in: items.map(sub => reminderKey(sub.id, sub.currentPeriodEnd)) } }, select: { initialReminderKey: true } });
  const sent = new Set(initial.map(row => row.initialReminderKey));
  return { ...page, total, items: items.map(item => ({
    id: item.id, name: item.user.name, email: item.user.email, role: item.user.role,
    levelNumber: item.level.levelNumber, periodEnd: item.currentPeriodEnd.toISOString(),
    alreadySent: sent.has(reminderKey(item.id, item.currentPeriodEnd)),
    lastNotificationId: item.notificationRecipients[0]?.notificationId,
    lastRecipientId: item.notificationRecipients[0]?.id,
  })) };
}

export async function getAdminNotifications(search: NotificationSearch) {
  await requireRole(Role.ADMIN);
  search = normalizeNotificationSearch(search);
  const where: Prisma.NotificationWhereInput = { type: typeFilter(search.type), sentById: search.senderId?.slice(0, 128) || undefined };
  const total = await prisma.notification.count({ where });
  const page = paging(search.page, total);
  const items = await prisma.notification.findMany({
    where, skip: page.skip, take: NOTIFICATION_PAGE_SIZE, orderBy: [{ sentAt: "desc" }, { id: "desc" }],
    include: { sentBy: { select: { name: true } }, _count: { select: { recipients: true } } },
  });
  return { ...page, total, items };
}

export async function getAdminNotification(id: string, pageValue?: string, recipientId?: string) {
  await requireRole(Role.ADMIN);
  const notification = await prisma.notification.findUnique({ where: { id }, include: { sentBy: { select: { id: true, name: true } }, resendOfRecipient: { select: { id: true, notificationId: true } } } });
  if (!notification) return null;
  const where = { notificationId: id };
  const [total, read] = await Promise.all([prisma.notificationRecipient.count({ where }), prisma.notificationRecipient.count({ where: { ...where, readAt: { not: null } } })]);
  const recipientWhere = { ...where, id: typeof recipientId === "string" && recipientId ? recipientId.slice(0, 128) : undefined };
  const matchingTotal = recipientWhere.id ? await prisma.notificationRecipient.count({ where: recipientWhere }) : total;
  const page = paging(pageValue, matchingTotal);
  const items = await prisma.notificationRecipient.findMany({
    where: recipientWhere, skip: page.skip, take: NOTIFICATION_PAGE_SIZE, orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
    include: { user: { select: { name: true, email: true, deletedAt: true } }, resend: { select: { id: true } }, subscription: { select: { currentPeriodEnd: true } } },
  });
  return { notification, ...page, total, read, items };
}

export async function getNotificationInbox(search: NotificationSearch) {
  const user = await requireUser();
  search = normalizeNotificationSearch(search);
  const now = new Date();
  const where: Prisma.NotificationRecipientWhereInput = { userId: user.id, receivedAt: { lte: now }, readAt: search.unread === "1" ? null : undefined, notification: { type: typeFilter(search.type) } };
  const [total, unreadCount] = await Promise.all([
    prisma.notificationRecipient.count({ where }), prisma.notificationRecipient.count({ where: { userId: user.id, readAt: null, receivedAt: { lte: now } } }),
  ]);
  const page = paging(search.page, total);
  const items = await prisma.notificationRecipient.findMany({
    where, skip: page.skip, take: NOTIFICATION_PAGE_SIZE, orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
    include: { notification: { select: { type: true, title: true, body: true } }, subscription: { select: { userId: true, currentPeriodEnd: true, status: true, product: true, level: { select: { isActive: true, requiresSubscription: true } } } } },
  });
  return { ...page, total, unreadCount, items: items.map(item => {
    const sub = item.subscription;
    const samePeriod = !!sub && sub.currentPeriodEnd.getTime() === item.periodEndSnapshot?.getTime();
    const matchesRole = (user.role === "STUDENT" && sub?.product === "STUDENT_PREMIUM") || (user.role === "TEACHER" && sub?.product === "TEACHER_PREMIUM");
    const canRenew = samePeriod && sub.userId === user.id && matchesRole && sub.level.isActive && sub.level.requiresSubscription && sub.status !== "REFUNDED";
    const renewalStatus = item.subscriptionId && !canRenew
      ? sub && item.periodEndSnapshot && sub.currentPeriodEnd > item.periodEndSnapshot ? "Suscripción renovada" : "Recordatorio no vigente"
      : null;
    return { ...item, canRenew, renewalStatus };
  }) };
}

export async function markNotificationsRead(userId: string, recipientId?: string, client: PrismaClient = prisma) {
  const now = new Date();
  const where: Prisma.NotificationRecipientWhereInput = { userId, user: eligibleUserWhere(now), receivedAt: { lte: now }, ...(recipientId ? { id: recipientId } : {}) };
  // Check ownership without exposing whether an unrelated identifier exists.
  if (recipientId && !await client.notificationRecipient.findFirst({ where, select: { id: true } })) throw new NotificationError("NOT_FOUND", "La notificación no está disponible.");
  return client.notificationRecipient.updateMany({ where: { ...where, readAt: null }, data: { readAt: now } });
}

export async function getNotificationRenewalDestination(userId: string, role: string, recipientId: string, client: PrismaClient = prisma) {
  const recipient = await client.notificationRecipient.findFirst({
    where: { id: recipientId, userId, user: eligibleUserWhere(), notification: { type: "SUBSCRIPTION_RENEWAL" } },
    include: { subscription: { include: { level: true } } },
  });
  const sub = recipient?.subscription;
  const product = role === "STUDENT" ? "STUDENT_PREMIUM" : role === "TEACHER" ? "TEACHER_PREMIUM" : null;
  if (!sub || sub.userId !== userId || sub.product !== product || !sub.level.isActive || !sub.level.requiresSubscription || sub.status === "REFUNDED" || sub.currentPeriodEnd.getTime() !== recipient?.periodEndSnapshot?.getTime()) return "/dashboard/notifications?notice=obsolete";
  const pending = await client.payment.findFirst({ where: { userId, levelId: sub.levelId, status: { in: ["INITIALIZING", "PROCESSING", "REQUIRES_REVIEW"] } }, orderBy: { createdAt: "desc" }, select: { id: true } });
  return pending ? `/dashboard/subscription/payments/${encodeURIComponent(pending.id)}` : `/dashboard/subscription/renew/${encodeURIComponent(sub.id)}`;
}
