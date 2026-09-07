import { string } from "zod";

import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
  PASSWORD_WEAK_MESSAGE,
  isStrongPassword,
} from "@/modules/auth/lib/password";

// Contrasena nueva valida en cualquier flujo (registro y restablecimiento).
export const strongPasswordSchema = string()
  .min(MIN_PASSWORD_LENGTH, PASSWORD_MIN_LENGTH_MESSAGE)
  .refine(isStrongPassword, PASSWORD_WEAK_MESSAGE);
