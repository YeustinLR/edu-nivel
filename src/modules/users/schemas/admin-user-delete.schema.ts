import { z } from "zod";

import { emailSchema } from "@/modules/auth/schemas/email.schema";

export const adminUserDeleteSchema = z.object({
  userId: z.string().trim().min(1),
  confirmationEmail: emailSchema.transform((email) => email.trim().toLowerCase()),
  reason: z.string().trim().min(5, "Explica brevemente por qué eliminas la cuenta.").max(500),
});

export type AdminUserDeleteInput = z.infer<typeof adminUserDeleteSchema>;
