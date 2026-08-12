import type { Metadata } from "next";
import { Suspense } from "react";

import AuthCard from "@/modules/auth/components/AuthCard";
import VerifyEmailForm from "@/modules/auth/components/VerifyEmailForm";

export const metadata: Metadata = {
  title: "Verificar correo",
};

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verifica tu correo"
      subtitle="Ingresa el codigo de seis digitos que enviamos a tu correo."
    >
      <Suspense fallback={null}>
        <VerifyEmailForm />
      </Suspense>
    </AuthCard>
  );
}
