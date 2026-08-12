import { z } from "zod";

export const adminUserInvitationOperationSchema = z.object({
  invitationId: z.string().trim().min(1, "La invitación es obligatoria."),
  operation: z.enum(["resend", "cancel"], {
    error: "La operación no es válida.",
  }),
});

export type AdminUserInvitationOperationInput = z.infer<
  typeof adminUserInvitationOperationSchema
>;
