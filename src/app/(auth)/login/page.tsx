import type { Metadata } from "next";
import { Suspense } from "react";

import AuthCard from "@/modules/auth/components/AuthCard";
import LoginForm from "@/modules/auth/components/LoginForm";
import { redirectAuthenticatedUser } from "@/server/auth/redirect-authenticated-user";

export const metadata: Metadata = {
  title: "Iniciar sesion",
};

export default async function LoginPage() {
  await redirectAuthenticatedUser();

  return (
    <AuthCard
      title="Iniciar sesion"
      subtitle="Accede a tu cuenta de EduNivel."
      className="mx-auto w-full max-w-md"
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
