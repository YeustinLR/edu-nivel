import "server-only";

import { getEmailFrom, getResendClient } from "@/server/mail/resend";
import { OtpEmail } from "@/server/mail/templates/otp-email";
import { otpRateLimitRequestContext } from "@/server/auth/otp-rate-limit-request-context";

type EmailOtpType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

type SendVerificationOtpData = {
  email: string;
  otp: string;
  type: EmailOtpType;
};

type OtpEmailContent = {
  subject: string;
  preview: string;
  heading: string;
  intro: string;
  footer: string;
  codeBoxBackgroundColor?: string;
};

export async function sendVerificationOTP(data: SendVerificationOtpData) {
  const { email, otp, type } = data;
  const resend = getResendClient();
  const from = getEmailFrom();
  const { subject, ...emailProps } = getOtpEmailContent(type, otp);

  const { error } = await resend.emails.send({
    from,
    to: email,
    subject,
    react: OtpEmail({ otp, ...emailProps }),
  });

  if (error) {
    throw new Error(error.message || "No se pudo enviar el correo OTP.");
  }

  const requestState = otpRateLimitRequestContext.getStore();
  if (requestState?.isSignUp && type === "email-verification") {
    requestState.initialOtpSent = true;
  }
}

// Copy de cada flujo OTP. El layout visual vive en `templates/otp-email.tsx`.
function getOtpEmailContent(type: EmailOtpType, otp: string): OtpEmailContent {
  if (type === "forget-password") {
    return {
      subject: "Restablece tu contraseña en EduNivel",
      preview: `Tu código para restablecer la contraseña es ${otp}`,
      heading: "Restablece tu contraseña",
      intro:
        "Usa este código para confirmar que el correo te pertenece y definir una nueva contraseña.",
      footer:
        "Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.",
      codeBoxBackgroundColor: "#ecfdf5",
    };
  }

  if (type === "email-verification") {
    return {
      subject: "Verifica tu correo en EduNivel",
      preview: `Tu código de verificación de EduNivel es ${otp}`,
      heading: "Verifica tu correo",
      intro: "Usa este código para activar tu cuenta de EduNivel.",
      footer: "Si no creaste una cuenta en EduNivel, puedes ignorar este correo.",
    };
  }

  return {
    subject: "Tu código de seguridad de EduNivel",
    preview: `Tu código de seguridad de EduNivel es ${otp}`,
    heading: "Tu código de seguridad",
    intro: "Usa este código para continuar con la acción solicitada en EduNivel.",
    footer: "Si no realizaste esta solicitud, puedes ignorar este correo.",
  };
}
