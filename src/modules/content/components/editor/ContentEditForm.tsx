"use client";

import { ContentFormActions } from "@/modules/content/components/forms/ContentFormPrimitives";
import type { ContentEditActionState } from "@/modules/content/types/content-edit-action-state";

export {
  ContentFieldError as EditFieldError,
  contentFormFieldClass as editorFieldClass,
} from "@/modules/content/components/forms/ContentFormPrimitives";

export function EditActionFeedback({ state }: { state: ContentEditActionState }) {
  if (state.status === "idle") return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${state.status === "error" ? "bg-red-500/10 text-red-700 dark:text-red-300" : "border border-success/30 bg-success/10 text-success"}`}>
      {state.message}
    </p>
  );
}

export function EditFormActions({ closeHref, onCancel, isPending, submitDisabled }: { closeHref?: string; onCancel?: () => void; isPending: boolean; submitDisabled?: boolean }) {
  return <ContentFormActions closeHref={closeHref} onCancel={onCancel} isPending={isPending} submitDisabled={submitDisabled} submitLabel="Guardar cambios" />;
}
