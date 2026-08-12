import type { Metadata } from "next";

import AuthCard from "@/modules/auth/components/AuthCard";
import ResetPasswordForm from "@/modules/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Restablecer contrasena",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Restablecer contrasena"
      subtitle="Ingresa el codigo recibido y define una nueva contrasena."
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
