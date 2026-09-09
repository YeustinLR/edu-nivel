"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { requireRole, requireUser } from "@/server/auth/guards";
import { NotificationError, sendNotification } from "@/server/notifications/send";
import { getNotificationCandidates, getRenewalCandidates, getNotificationRenewalDestination, markNotificationsRead, type NotificationSearch } from "@/server/notifications/queries";
import { audienceSchema, type NotificationActionState } from "@/modules/notifications/schemas/notification.schema";
import { eligibleUserWhere } from "@/modules/notifications/domain/notifications";
import { prisma } from "@/server/db/prisma";

export async function previewNotificationRecipientsAction(search: NotificationSearch, renewals = false) {
  await requireRole(Role.ADMIN);
  return renewals ? getRenewalCandidates(search) : getNotificationCandidates(search);
}

export async function previewNotificationAudienceAction(raw: unknown) {
  await requireRole(Role.ADMIN);
  const audience = audienceSchema.parse(raw);
  return prisma.user.count({ where: { AND: [eligibleUserWhere(), audience.mode === "SELECTED_USERS" ? { id: { in: audience.userIds } } : audience.mode === "ROLES" ? { role: { in: audience.roles } } : {}] } });
}

async function submit(raw: unknown): Promise<NotificationActionState> {
  const admin = await requireRole(Role.ADMIN);
  try {
    const result = await sendNotification(raw, admin.id);
    revalidatePath("/dashboard/admin/notifications", "layout");
    revalidatePath("/dashboard/notifications");
    return { status: "success", message: result.replayed ? "Este envío ya estaba confirmado." : "Notificaciones enviadas.", notificationId: result.notificationId };
  } catch (error) {
    if (error instanceof NotificationError) return { status: "error", code: error.code, message: error.message };
    throw error;
  }
}

export async function sendNotificationAction(raw: unknown) { return submit({ ...(raw as object), operation: "send" }); }
export async function sendRenewalRemindersAction(raw: unknown) { return submit({ ...(raw as object), operation: "renew" }); }
export async function resendRenewalReminderAction(raw: unknown) { return submit({ ...(raw as object), operation: "resend" }); }

export async function markNotificationReadAction(recipientId: string): Promise<NotificationActionState> {
  const user = await requireUser();
  if (typeof recipientId !== "string" || !recipientId || recipientId.length > 128) return { status: "error", message: "La notificación no está disponible." };
  try { await markNotificationsRead(user.id, recipientId); }
  catch (error) { if (error instanceof NotificationError) return { status: "error", message: error.message }; throw error; }
  revalidatePath("/dashboard/notifications");
  return { status: "success", message: "Notificación marcada como leída." };
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionState> {
  const user = await requireUser();
  await markNotificationsRead(user.id);
  revalidatePath("/dashboard/notifications");
  return { status: "success", message: "Todas las notificaciones existentes se marcaron como leídas." };
}

export async function openNotificationAction(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("recipientId");
  if (typeof id !== "string" || !id || id.length > 128) {
    redirect("/dashboard/notifications");
  }
  try {
    await markNotificationsRead(user.id, id);
  } catch (error) {
    if (error instanceof NotificationError) redirect("/dashboard/notifications");
    throw error;
  }
  revalidatePath("/dashboard/notifications");
  redirect(
    `/dashboard/notifications#notification-${encodeURIComponent(id)}`,
  );
}

export async function openNotificationRenewalAction(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("recipientId");
  if (typeof id !== "string" || id.length > 128) redirect("/dashboard/notifications?notice=obsolete");
  redirect(await getNotificationRenewalDestination(user.id, user.role, id));
}
