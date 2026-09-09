import "server-only";

import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { eligibleUserSelect, eligibleUserWhere, isNotificationUserEligible, MAX_NOTIFICATION_RECIPIENTS, reminderKey, renewalWhere } from "@/modules/notifications/domain/notifications";
import { notificationCommandSchema, type NotificationCommand } from "@/modules/notifications/schemas/notification.schema";
import { prisma } from "@/server/db/prisma";
import { isRetryableSerializableConflict, waitBeforeSerializableRetry } from "@/server/payments/onvo/serializable-transaction";

export class NotificationError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = "NotificationError"; }
}

export function canonicalCommand(input: NotificationCommand) {
  const { requestId: _requestId, ...command } = input;
  void _requestId;
  if (command.operation === "send") {
    if (command.audience.mode === "SELECTED_USERS") command.audience = { mode: "SELECTED_USERS", userIds: [...new Set(command.audience.userIds)].sort() };
    if (command.audience.mode === "ROLES") command.audience = { mode: "ROLES", roles: [...new Set(command.audience.roles)].sort() };
  }
  if (command.operation === "renew") {
    const unique = new Map<string, string>();
    for (const sub of command.subscriptions) {
      const end = new Date(sub.periodEnd).toISOString();
      if (unique.has(sub.id) && unique.get(sub.id) !== end) throw new NotificationError("INVALID_INPUT", "La selección contiene períodos diferentes para una misma suscripción.");
      unique.set(sub.id, end);
    }
    command.subscriptions = [...unique].sort(([a], [b]) => a.localeCompare(b)).map(([id, periodEnd]) => ({ id, periodEnd }));
  }
  return command;
}

export type NotificationDb = Prisma.TransactionClient;

export async function pendingPaymentExclusions(db: NotificationDb): Promise<Prisma.SubscriptionWhereInput> {
  const pairs = await db.payment.findMany({
    where: { status: { in: ["INITIALIZING", "PROCESSING", "REQUIRES_REVIEW"] } },
    distinct: ["userId", "levelId"], select: { userId: true, levelId: true },
  });
  return pairs.length ? { NOT: { OR: pairs } } : {};
}

function existingResult(existing: { id: string; sentById: string; payloadHash: string }, actorId: string, hash: string) {
  if (existing.sentById !== actorId || existing.payloadHash !== hash) throw new NotificationError("IDEMPOTENCY_CONFLICT", "Esta solicitud ya se utilizó para un envío diferente.");
  return { notificationId: existing.id, replayed: true };
}

/** Atomic internal delivery: never sends email and never commits partial batches. */
export async function sendNotification(raw: unknown, actorId: string, client: PrismaClient = prisma) {
  const parsed = notificationCommandSchema.safeParse(raw);
  if (!parsed.success) throw new NotificationError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Revisa los datos del envío.");
  const input = parsed.data;
  const command = canonicalCommand(input);
  const hash = createHash("sha256").update(JSON.stringify(command)).digest("hex");
  // Reserve time for authorization, invalidation and the response within the 60s route budget.
  const deadline = Date.now() + 45_000;

  for (let attempt = 0; attempt < 3; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 6_000) throw new NotificationError("CONCURRENT_OPERATION", "No se pudo confirmar el envío a tiempo. Reintenta con la misma solicitud.");
    try {
      return await client.$transaction(async (tx) => {
        const now = new Date();
        const actor = await tx.user.findUnique({ where: { id: actorId }, select: eligibleUserSelect });
        if (!actor || actor.role !== "ADMIN" || !isNotificationUserEligible(actor, now)) throw new NotificationError("FORBIDDEN", "No tienes permisos para enviar notificaciones.");
        const existing = await tx.notification.findUnique({ where: { requestId: input.requestId } });
        if (existing) return existingResult(existing, actorId, hash);

        let title = "Recordatorio de renovación";
        let body = "Consulta el vencimiento de tu acceso y renueva tu suscripción.";
        let audienceMode: Prisma.NotificationCreateInput["audienceMode"] = "SUBSCRIPTIONS";
        let audienceRoles: ("STUDENT" | "TEACHER" | "COLLABORATOR" | "ADMIN")[] = [];
        let resendOfRecipientId: string | undefined;
        type Delivery = { userId: string; targetKey: string; subscriptionId?: string; periodEndSnapshot?: Date; levelNumberSnapshot?: number; initialReminderKey?: string };
        let deliveries: Delivery[];

        if (command.operation === "send") {
          title = command.title; body = command.body; audienceMode = command.audience.mode;
          const selection: Prisma.UserWhereInput = command.audience.mode === "SELECTED_USERS"
            ? { id: { in: command.audience.userIds } }
            : command.audience.mode === "ROLES" ? { role: { in: command.audience.roles } } : {};
          if (command.audience.mode === "ROLES") audienceRoles = command.audience.roles;
          const users = await tx.user.findMany({ where: { AND: [eligibleUserWhere(now), selection] }, select: { id: true }, take: MAX_NOTIFICATION_RECIPIENTS + 1 });
          if (command.audience.mode === "SELECTED_USERS" && users.length !== command.audience.userIds.length) throw new NotificationError("INELIGIBLE_RECIPIENT", "Una cuenta seleccionada ya no está habilitada. Revisa la selección.");
          deliveries = users.map(user => ({ userId: user.id, targetKey: `user:${user.id}` }));
        } else {
          let selected = command.operation === "renew" ? command.subscriptions : [];
          if (command.operation === "resend") {
            const previous = await tx.notificationRecipient.findUnique({ where: { id: command.recipientId }, include: { notification: true, resend: { select: { id: true } } } });
            if (!previous?.subscriptionId || !previous.periodEndSnapshot || previous.notification.type !== "SUBSCRIPTION_RENEWAL") throw new NotificationError("NOT_FOUND", "El recordatorio no está disponible.");
            if (previous.resend) throw new NotificationError("ALREADY_RESENT", "Este aviso ya fue reenviado. Abre el envío más reciente.");
            resendOfRecipientId = previous.id;
            selected = [{ id: previous.subscriptionId, periodEnd: previous.periodEndSnapshot.toISOString() }];
          }
          const subscriptions = await tx.subscription.findMany({
            where: { AND: [renewalWhere(now), await pendingPaymentExclusions(tx), { id: { in: selected.map(sub => sub.id) } }] },
            select: { id: true, userId: true, currentPeriodEnd: true, level: { select: { levelNumber: true } } },
          });
          const expected = new Map(selected.map(sub => [sub.id, sub.periodEnd]));
          if (subscriptions.length !== selected.length || subscriptions.some(sub => sub.currentPeriodEnd.toISOString() !== expected.get(sub.id))) throw new NotificationError("PERIOD_CHANGED", "Una suscripción cambió, ya fue renovada o no admite un recordatorio. Actualiza la selección.");
          deliveries = subscriptions.map(sub => ({
            userId: sub.userId, targetKey: `subscription:${sub.id}`, subscriptionId: sub.id,
            periodEndSnapshot: sub.currentPeriodEnd, levelNumberSnapshot: sub.level.levelNumber,
            ...(resendOfRecipientId ? {} : { initialReminderKey: reminderKey(sub.id, sub.currentPeriodEnd) }),
          }));
          if (!resendOfRecipientId && await tx.notificationRecipient.count({ where: { initialReminderKey: { in: deliveries.map(d => d.initialReminderKey!) } } })) throw new NotificationError("ALREADY_SENT", "Ya existe un recordatorio para uno de estos períodos. Utiliza Reenviar desde el historial.");
        }
        if (!deliveries.length) throw new NotificationError("EMPTY_AUDIENCE", "No hay destinatarios habilitados.");
        if (deliveries.length > MAX_NOTIFICATION_RECIPIENTS) throw new NotificationError("AUDIENCE_LIMIT", "El envío supera el límite de 10.000 destinatarios.");

        const notification = await tx.notification.create({ data: {
          title, body, type: command.operation === "send" ? command.type : "SUBSCRIPTION_RENEWAL",
          sentById: actorId, sentAt: now, audienceMode, audienceRoles, requestId: input.requestId, payloadHash: hash, resendOfRecipientId,
        } });
        for (let offset = 0; offset < deliveries.length; offset += 500) {
          const rows = await tx.notificationRecipient.createManyAndReturn({
            data: deliveries.slice(offset, offset + 500).map(d => ({ ...d, notificationId: notification.id, receivedAt: now })),
            select: { id: true, userId: true, subscriptionId: true, periodEndSnapshot: true },
          });
          await tx.adminAuditLog.createMany({ data: rows.map(row => ({
            actorId, targetUserId: row.userId,
            action: resendOfRecipientId ? "NOTIFICATION_RENEWAL_RESENT" : "NOTIFICATION_SENT",
            changes: { notificationId: notification.id, recipientId: row.id, subscriptionId: row.subscriptionId, periodEnd: row.periodEndSnapshot?.toISOString() ?? null, resendOfRecipientId: resendOfRecipientId ?? null },
          })) });
        }
        return { notificationId: notification.id, replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: Math.min(30_000, remaining - 5_000), maxWait: 5_000 });
    } catch (error) {
      if (isRetryableSerializableConflict(error) && attempt < 2) { await waitBeforeSerializableRetry(attempt); continue; }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Retry once in a fresh transaction: rechecks actor and identifies which invariant won.
        if (attempt < 2) continue;
        throw new NotificationError("CONCURRENT_OPERATION", "Otra operación completó este envío. Actualiza el historial.");
      }
      if (error instanceof NotificationError) throw error;
      console.error("notification_send_failed", { requestId: input.requestId, code: isRetryableSerializableConflict(error) ? "CONCURRENT_OPERATION" : "DATABASE_ERROR" });
      throw new NotificationError("SEND_FAILED", "No se pudo confirmar el envío. Reintenta con la misma solicitud.");
    }
  }
  throw new NotificationError("CONCURRENT_OPERATION", "La selección cambió. Inténtalo de nuevo.");
}
