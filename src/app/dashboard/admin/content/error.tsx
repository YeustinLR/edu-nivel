"use client";

import AuthErrorBoundary from "@/modules/auth/components/AuthErrorBoundary";

export default function AdminContentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <AuthErrorBoundary error={error} reset={reset} />;
}
