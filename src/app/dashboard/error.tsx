"use client";

import AuthErrorBoundary from "@/modules/auth/components/AuthErrorBoundary";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AuthErrorBoundary error={error} reset={reset} />;
}
