import { object, string, type infer as Infer } from "zod";

import { AUTH_VALIDATION_MESSAGES } from "@/modules/auth/lib/messages";
import { emailSchema } from "@/modules/auth/schemas/email.schema";

export const loginSchema = object({
  email: emailSchema,
  password: string().min(1, AUTH_VALIDATION_MESSAGES.passwordRequired),
});

export type LoginInput = Infer<typeof loginSchema>;
