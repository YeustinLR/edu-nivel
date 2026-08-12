import "server-only";

import { getEmailFrom, getResendClient } from "@/server/mail/resend";
import { OtpEmail } from "@/server/mail/templates/otp-email";

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
}

// Copy de cada flujo OTP. El layout visual vive en `templates/otp-email.tsx`.
function getOtpEmailContent(type: EmailOtpType, otp: string): OtpEmailContent {
  if (type === "forget-password") {
    return {
      subject: "Restablece tu contrasena en EduNivel",
      preview: `Tu codigo para restablecer la contrasena es ${otp}`,
      heading: "Restablece tu contrasena",
      intro:
        "Usa este codigo para confirmar que el correo te pertenece y definir una nueva contrasena.",
      footer:
        "Si no solicitaste restablecer tu contrasena, puedes ignorar este correo.",
      codeBoxBackgroundColor: "#ecfdf5",
    };
  }

  if (type === "email-verification") {
    return {
      subject: "Verifica tu correo en EduNivel",
      preview: `Tu codigo de verificacion de EduNivel es ${otp}`,
      heading: "Verifica tu correo",
      intro: "Usa este codigo para activar tu cuenta de EduNivel.",
      footer: "Si no creaste una cuenta en EduNivel, puedes ignorar este correo.",
    };
  }

  return {
    subject: "Tu codigo de seguridad de EduNivel",
    preview: `Tu codigo de seguridad de EduNivel es ${otp}`,
    heading: "Tu codigo de seguridad",
    intro: "Usa este codigo para continuar con la accion solicitada en EduNivel.",
    footer: "Si no realizaste esta solicitud, puedes ignorar este correo.",
  };
}
