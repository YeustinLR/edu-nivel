"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function StudentContentError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-96 items-center justify-center">
      <div
        role="alert"
        className="w-full max-w-xl rounded-card border border-rose-300/60 bg-surface p-6 text-center shadow-sm dark:border-rose-400/20 dark:bg-[var(--student-panel)]"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[16px] bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
          <AlertTriangle aria-hidden="true" className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-heading text-xl font-bold text-ink-900 dark:text-[var(--student-text)]">
          No pudimos cargar tus materias
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-500 dark:text-[var(--student-muted)]">
          Tu progreso y tus recursos guardados permanecen seguros. Puedes volver
          a intentarlo sin repetir ninguna operación.
        </p>
        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-control bg-violet px-4 text-sm font-bold text-white"
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Intentar de nuevo
          </button>
          <Link
            href="/dashboard/student"
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-line px-4 text-sm font-bold text-ink-900 dark:border-[var(--student-border)] dark:text-[var(--student-text)]"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
