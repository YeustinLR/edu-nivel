import type { Metadata } from "next";

import AuthCard from "@/modules/auth/components/AuthCard";
import ResetPasswordForm from "@/modules/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Restablecer contraseña",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Restablecer contraseña"
      subtitle="Ingresa el código recibido y define una nueva contraseña."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
