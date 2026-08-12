import { z } from "zod";

import { AUTH_VALIDATION_MESSAGES } from "@/modules/auth/lib/messages";

// Campo de correo compartido por todos los flujos de auth: normaliza una sola vez.
export const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.email(AUTH_VALIDATION_MESSAGES.emailInvalid));
