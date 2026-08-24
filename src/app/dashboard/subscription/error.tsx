"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function SubscriptionError({ reset }: { reset: () => void }) {
  return (
    <div className="student-subscription-theme flex min-h-96 items-center justify-center">
      <div role="alert" className="w-full max-w-xl rounded-[1.25rem] border border-rose-300/60 bg-[var(--subscription-panel)] p-5 text-center shadow-sm dark:border-rose-400/20">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
          <AlertTriangle aria-hidden="true" className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-extrabold text-[var(--subscription-text)]">No pudimos cargar Mi suscripción</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--subscription-muted)]">Tus pagos y accesos están guardados. Puedes volver a intentarlo sin crear una nueva operación.</p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--subscription-accent)] px-4 text-sm font-bold text-white">
            <RefreshCw aria-hidden="true" className="h-4 w-4" />Intentar de nuevo
          </button>
          <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--subscription-border)] px-4 text-sm font-bold text-[var(--subscription-text)]">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
