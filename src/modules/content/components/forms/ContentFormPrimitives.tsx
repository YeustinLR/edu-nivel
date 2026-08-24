"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";

export const contentFormFieldClass =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60";

export function ContentFieldError({
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

export function ContentFormActions({
  closeHref,
  onCancel,
  isPending,
  submitDisabled = false,
  submitLabel = "Guardar",
  pendingLabel = "Guardando…",
  submitName,
  submitValue,
  secondarySubmit,
}: {
  closeHref?: string;
  onCancel?: () => void;
  isPending: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  pendingLabel?: string;
  submitName?: string;
  submitValue?: string;
  secondarySubmit?: { label: string; value: string };
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
      {onCancel ? (
        <button
          type="button"
          disabled={isPending}
          onClick={onCancel}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 sm:w-auto"
        >
          Cancelar
        </button>
      ) : closeHref ? (
        <Link
          href={closeHref}
          aria-disabled={isPending || undefined}
          className={`inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-5 py-2 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:w-auto ${
            isPending
              ? "pointer-events-none opacity-50"
              : "hover:bg-surface-elevated"
          }`}
        >
          Cancelar
        </Link>
      ) : null}
      {secondarySubmit ? (
        <button
          type="submit"
          name={submitName}
          value={secondarySubmit.value}
          disabled={isPending || submitDisabled}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-background px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 sm:w-auto"
        >
          {isPending ? pendingLabel : secondarySubmit.label}
        </button>
      ) : null}
      <button
        type="submit"
        name={submitName}
        value={submitValue}
        disabled={isPending || submitDisabled}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-white hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50 sm:w-auto"
      >
        {isPending ? (
          <>
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 motion-safe:animate-spin"
            />
            {pendingLabel}
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
