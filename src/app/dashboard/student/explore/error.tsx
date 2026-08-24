"use client";

import { AlertTriangle } from "lucide-react";

export default function StudentExploreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-[1.35rem] border border-[var(--student-border)] bg-[var(--student-panel)] px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"><AlertTriangle aria-hidden="true" className="h-7 w-7" /></span>
      <h1 className="mt-4 text-xl font-extrabold text-[var(--student-text)]">No pudimos cargar el catálogo</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--student-muted)]">Inténtalo nuevamente. Tu sesión y el contenido protegido continúan seguros.</p>
      <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl bg-[var(--student-blue)] px-5 text-sm font-extrabold text-white">Reintentar</button>
    </div>
  );
}
