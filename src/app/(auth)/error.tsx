/**
 * Reutiliza el boundary de auth para errores que ocurran dentro del flujo publico
 * de login/registro. Esto mantiene mensajes y redirecciones consistentes.
 */
"use client";

import AuthErrorBoundary from "@/modules/auth/components/AuthErrorBoundary";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AuthErrorBoundary error={error} reset={reset} />;
}
