import type { Metadata } from "next";
import { Suspense } from "react";

import AuthCard from "@/modules/auth/components/AuthCard";
import RegisterForm from "@/modules/auth/components/RegisterForm";
import { redirectAuthenticatedUser } from "@/server/auth/redirect-authenticated-user";

export const metadata: Metadata = {
  title: "Registrarse",
};

export default async function RegisterPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Completa tus datos y verifica tu correo para activar la cuenta."
      className="mx-auto w-full max-w-lg"
      compact
    >
      <Suspense fallback={null}>
        <RegisterForm />
      </Suspense>
    </AuthCard>
  );
}
