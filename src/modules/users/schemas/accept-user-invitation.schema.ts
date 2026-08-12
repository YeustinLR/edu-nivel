import { z } from "zod";

import { isAllowedDeclaredAge } from "@/modules/auth/lib/age";
import {
  PASSWORD_CONFIRM_REQUIRED_MESSAGE,
  PASSWORD_CONTAINS_EMAIL_MESSAGE,
  PASSWORD_MISMATCH_MESSAGE,
  passwordContainsEmail,
} from "@/modules/auth/lib/password";
import { emailSchema } from "@/modules/auth/schemas/email.schema";
import { strongPasswordSchema } from "@/modules/auth/schemas/password.schema";
import { accountRegistrationRoleSchema } from "@/modules/auth/lib/registration-role";

export const acceptUserInvitationSchema = z
  .object({
    invitationToken: z
      .string()
      .min(40, "La invitación no es válida.")
      .max(100, "La invitación no es válida.")
      .regex(/^[A-Za-z0-9_-]+$/, "La invitación no es válida."),
    name: z
      .string()
      .trim()
      .min(2, "Escribe tu nombre.")
      .max(100, "El nombre no puede superar 100 caracteres."),
    email: emailSchema.transform((email) => email.trim().toLowerCase()),
    role: accountRegistrationRoleSchema,
    ageDeclared: z.coerce
      .number({ error: "Selecciona tu edad." })
      .int("Selecciona una edad válida.")
      .refine(isAllowedDeclaredAge, "Debes tener 18 años o más."),
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, PASSWORD_CONFIRM_REQUIRED_MESSAGE),
    acceptTerms: z.literal(true, { error: "Debes aceptar los términos legales." }),
    acceptPrivacy: z.literal(true, { error: "Debes aceptar la política de privacidad." }),
    adultDeclaration: z.literal(true, { error: "Debes declarar que tienes 18 años o más." }),
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

export type AcceptUserInvitationInput = z.infer<
  typeof acceptUserInvitationSchema
>;
