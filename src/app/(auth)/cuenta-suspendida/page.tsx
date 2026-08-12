import type { Metadata } from "next";
import Link from "next/link";

import AuthCard from "@/modules/auth/components/AuthCard";

export const metadata: Metadata = { title: "Cuenta suspendida" };

export default function SuspendedAccountPage() {
  return (
    <AuthCard
      title="Cuenta suspendida"
      subtitle="Tu acceso fue suspendido por un administrador. Contacta al equipo de EduNivel si necesitas más información."
    >
      <Link
        href="/login"
        className="btn-primary block w-full rounded-lg px-5 py-3 text-center text-small"
      >
        Volver al inicio de sesión
      </Link>
    </AuthCard>
  );
}
