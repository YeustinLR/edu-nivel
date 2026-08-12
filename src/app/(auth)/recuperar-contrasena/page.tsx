import type { Metadata } from "next";

import AuthCard from "@/modules/auth/components/AuthCard";
import ForgotPasswordForm from "@/modules/auth/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recuperar contrasena",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contrasena"
      subtitle="Te enviaremos un codigo para restablecer tu acceso."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
