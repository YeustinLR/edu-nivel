"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";


export const adminUserFieldClass =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60";

export function AdminUserFieldError({
  id,
  messages,
}: {
  id: string;
  messages?: string[];
}) {
  return (
    <span
      id={id}
      className="block min-h-4 text-xs font-normal text-red-600 dark:text-red-400"
    >
      {messages?.[0]}
    </span>
  );
}

export function AdminUserActionFeedback({
  state,
}: {
  state:
    | { status: "idle" }
    | { status: "error" | "success"; message: string };
}) {
  if (state.status === "idle") return null;

  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={`rounded-lg px-3 py-2 text-sm ${
        state.status === "error"
          ? "bg-red-500/10 text-red-700 dark:text-red-300"
          : "border border-success/30 bg-success/10 text-success"
      }`}
    >
      {state.message}
    </p>
  );
}

export function AdminUserFormActions({
  cancelHref,
  isPending,
}: {
  cancelHref: string;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
      <Link
        href={cancelHref}
        aria-disabled={isPending || undefined}
        className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:w-auto ${
          isPending
            ? "pointer-events-none opacity-50"
            : "hover:bg-surface-elevated"
        }`}
      >
        Cancelar
      </Link>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-white hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 sm:w-auto"
      >
        {isPending ? (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 motion-safe:animate-spin"
            />
            Guardando…
          </>
        ) : (
          "Guardar cambios"
        )}
      </button>
    </div>
  );
}
