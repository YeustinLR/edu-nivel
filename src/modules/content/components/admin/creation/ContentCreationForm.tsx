"use client";

import { AlertCircle, CircleCheck } from "lucide-react";
import Link from "next/link";

import { ContentFormActions } from "@/modules/content/components/forms/ContentFormPrimitives";
import type { ContentCreationActionState } from "@/modules/content/types/content-creation-action-state";

export {
  ContentFieldError as CreationFieldError,
  contentFormFieldClass as creationFieldClass,
} from "@/modules/content/components/forms/ContentFormPrimitives";

export function CreationActionFeedback({ state }: { state: ContentCreationActionState }) {
  if (state.status === "error") {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-300">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{state.message}</span>
      </div>
    );
  }
  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-5">
        <p role="status" className="flex items-center gap-2 font-medium text-success"><CircleCheck aria-hidden="true" className="h-5 w-5" />{state.message}</p>
        <p className="mt-1 text-sm text-foreground-secondary">El catálogo ya fue actualizado.</p>
        <Link href={state.destinationHref} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">{state.destinationLabel}</Link>
      </div>
    );
  }
  return null;
}

export function CreationFormActions({
  closeHref,
  onCancel,
  isPending,
  submitDisabled,
  submitLabel = "Guardar",
  pendingLabel,
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
    <ContentFormActions
      closeHref={closeHref}
      onCancel={onCancel}
      isPending={isPending}
      submitDisabled={submitDisabled}
      submitLabel={submitLabel}
      pendingLabel={pendingLabel}
      submitName={submitName}
      submitValue={submitValue}
      secondarySubmit={secondarySubmit}
    />
  );
}
