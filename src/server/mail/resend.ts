import "server-only";

import { Resend } from "resend";

import { env } from "@/config/env";

let resendClient: Resend | null = null;

export function getResendClient() {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurado.");
  }

  resendClient ??= new Resend(env.RESEND_API_KEY);
  return resendClient;
}

export function getEmailFrom() {
  if (!env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM no está configurado.");
  }

  return env.EMAIL_FROM;
}
