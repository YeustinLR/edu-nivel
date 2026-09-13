import type { Metadata } from "next";

import AuthCard from "@/modules/auth/components/AuthCard";
import ForgotPasswordForm from "@/modules/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      subtitle="Te enviaremos un código para restablecer tu acceso."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
