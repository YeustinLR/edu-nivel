import { z } from "zod";

import { emailSchema } from "@/modules/auth/schemas/email.schema";

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
