"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

export function CopyValueButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timeout = window.setTimeout(() => setState("idle"), 2_500);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button type="button" onClick={copyValue} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--subscription-accent)] px-4 text-sm font-bold text-[var(--subscription-accent)] transition hover:bg-[var(--subscription-accent-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--subscription-accent)]">
        {state === "copied" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
        {state === "copied" ? "Copiado" : label}
      </button>
      <span aria-live="polite" className="sr-only">
        {state === "copied"
          ? "Valor copiado"
          : state === "failed"
            ? "No se pudo copiar"
            : ""}
      </span>
      {state === "failed" ? (
        <span className="text-xs text-rose-600 dark:text-rose-300">
          No se pudo copiar. Selecciona el valor manualmente.
        </span>
      ) : null}
    </div>
  );
}
