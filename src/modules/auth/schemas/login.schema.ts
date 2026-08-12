import { z } from "zod";

import { AUTH_VALIDATION_MESSAGES } from "@/modules/auth/lib/messages";
import { emailSchema } from "@/modules/auth/schemas/email.schema";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, AUTH_VALIDATION_MESSAGES.passwordRequired),
});

export type LoginInput = z.infer<typeof loginSchema>;
