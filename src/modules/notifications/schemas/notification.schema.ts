import { array, discriminatedUnion, enum as zodEnum, literal, object, string, uuid, iso, type infer as Infer } from "zod";
import { MAX_NOTIFICATION_RECIPIENTS } from "@/modules/notifications/domain/notifications";

const id = string().trim().min(1).max(128);
const roles = array(zodEnum(["STUDENT", "TEACHER", "COLLABORATOR", "ADMIN"])).min(1).max(4);
export const audienceSchema = discriminatedUnion("mode", [
  object({ mode: literal("SELECTED_USERS"), userIds: array(id).min(1).max(MAX_NOTIFICATION_RECIPIENTS) }),
  object({ mode: literal("ALL_USERS") }),
  object({ mode: literal("ROLES"), roles }),
]);
export const notificationCommandSchema = discriminatedUnion("operation", [
  object({
    operation: literal("send"), requestId: uuid(),
    type: zodEnum(["GENERAL_ALERT", "IMPORTANT_NOTICE"]),
    title: string().trim().min(1, "Escribe un título.").max(150),
    body: string().trim().min(1, "Escribe el mensaje.").max(5000),
    audience: audienceSchema,
  }),
  object({
    operation: literal("renew"), requestId: uuid(),
    subscriptions: array(object({ id, periodEnd: iso.datetime() })).min(1).max(MAX_NOTIFICATION_RECIPIENTS),
  }),
  object({ operation: literal("resend"), requestId: uuid(), recipientId: id }),
]);
export type NotificationCommand = Infer<typeof notificationCommandSchema>;
export type NotificationAudience = Infer<typeof audienceSchema>;
export type NotificationActionState = { status: "idle" | "success" | "error"; message?: string; notificationId?: string; code?: string };
