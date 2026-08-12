import { z } from "zod";

import { AUTH_OTP_LENGTH } from "@/modules/auth/lib/otp";

// Solo digitos, en la cantidad exacta configurada para el OTP.
export const otpSchema = z
  .string()
  .regex(
    new RegExp(`^\\d{${AUTH_OTP_LENGTH}}$`),
    `Ingresa el codigo de ${AUTH_OTP_LENGTH} digitos.`,
  );
