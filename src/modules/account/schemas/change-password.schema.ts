import { z } from "zod";

import {
  PASSWORD_CONFIRM_REQUIRED_MESSAGE,
  PASSWORD_CONTAINS_EMAIL_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
  passwordContainsEmail,
} from "@/modules/auth/lib/password";
import { strongPasswordSchema } from "@/modules/auth/schemas/password.schema";

export const PASSWORD_UNCHANGED_MESSAGE =
  "La nueva contraseña debe ser diferente de la actual.";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, PASSWORD_CONFIRM_REQUIRED_MESSAGE),
    email: z.string().email(),
    revokeOtherSessions: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (passwordContainsEmail(data.newPassword, data.email)) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: PASSWORD_CONTAINS_EMAIL_MESSAGE,
      });
    }

    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: PASSWORD_UNCHANGED_MESSAGE,
      });
    }

    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: PASSWORD_MISMATCH_MESSAGE,
      });
    }
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

