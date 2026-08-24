"use client";

import { useEffect, useId, useRef } from "react";

export type WorkspaceConfirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => void;
};

export function WorkspaceConfirmationDialog({
  confirmation,
  pending,
  onClose,
}: {
  confirmation: WorkspaceConfirmation | null;
  pending: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (confirmation && !dialog.open) dialog.showModal();
    if (!confirmation && dialog.open) dialog.close();
  }, [confirmation]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[min(92vw,28rem)] overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-slate-950/45"
    >
      {confirmation ? (
        <div className="p-5">
          <h2 id={titleId} className="text-base font-semibold">
            {confirmation.title}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm leading-6 text-muted">
            {confirmation.description}
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmation.action}
              className={`min-h-10 rounded-lg px-4 text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
                confirmation.destructive
                  ? "bg-red-600 hover:bg-red-700 focus-visible:outline-red-500"
                  : "bg-secondary hover:bg-secondary/90 focus-visible:outline-secondary"
              }`}
            >
              {pending ? "Procesando…" : confirmation.confirmLabel}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
