import { z } from "zod";

import { emailSchema } from "@/modules/auth/schemas/email.schema";
import { otpSchema } from "@/modules/auth/schemas/otp.schema";

export const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: otpSchema,
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
