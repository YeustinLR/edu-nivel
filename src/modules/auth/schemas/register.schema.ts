import { z } from "zod";

import { isAllowedDeclaredAge, parseDeclaredAge } from "@/modules/auth/lib/age";
import { AUTH_VALIDATION_MESSAGES } from "@/modules/auth/lib/messages";
import {
  PASSWORD_CONFIRM_REQUIRED_MESSAGE,
  PASSWORD_CONTAINS_EMAIL_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
  passwordContainsEmail,
} from "@/modules/auth/lib/password";
import { registrationRoleSchema } from "@/modules/auth/lib/registration-role";
import { emailSchema } from "@/modules/auth/schemas/email.schema";
import { strongPasswordSchema } from "@/modules/auth/schemas/password.schema";

export const registerSchema = z
  .object({
    role: registrationRoleSchema,
    name: z.string().trim().min(2, AUTH_VALIDATION_MESSAGES.nameRequired),
    email: emailSchema,
    ageDeclared: z.coerce
      .number({ error: "Selecciona tu edad." })
      .int("Selecciona una edad válida.")
      .refine(isAllowedDeclaredAge, "Debes tener 18 años o más para crear una cuenta."),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, PASSWORD_CONFIRM_REQUIRED_MESSAGE),
    acceptTerms: z.literal(true, {
      error: "Debes aceptar los términos legales.",
    }),
    acceptPrivacy: z.literal(true, {
      error: "Debes aceptar la política de privacidad.",
    }),
    adultDeclaration: z.literal(true, {
      error: "Debes declarar que tienes 18 años o más.",
    }),
  })
  .superRefine((data, ctx) => {
    const ageDeclared = parseDeclaredAge(data.ageDeclared);

    if (!ageDeclared || !isAllowedDeclaredAge(ageDeclared)) {
      ctx.addIssue({
        code: "custom",
        path: ["ageDeclared"],
        message: "Debes tener 18 años o más para crear una cuenta.",
      });
    }

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

export type RegisterInput = z.infer<typeof registerSchema>;
