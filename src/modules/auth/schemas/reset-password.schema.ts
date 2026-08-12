import { z } from "zod";

import {
  PASSWORD_CONFIRM_REQUIRED_MESSAGE,
  PASSWORD_CONTAINS_EMAIL_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
  passwordContainsEmail,
} from "@/modules/auth/lib/password";
import { emailSchema } from "@/modules/auth/schemas/email.schema";
import { otpSchema } from "@/modules/auth/schemas/otp.schema";
import { strongPasswordSchema } from "@/modules/auth/schemas/password.schema";

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    otp: otpSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, PASSWORD_CONFIRM_REQUIRED_MESSAGE),
  })
  .superRefine((data, ctx) => {
    if (passwordContainsEmail(data.password, data.email)) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: PASSWORD_CONTAINS_EMAIL_MESSAGE,
      });
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: PASSWORD_MISMATCH_MESSAGE,
      });
    }
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
