"use client";

import { Bookmark, LoaderCircle } from "lucide-react";
import { useState, useTransition } from "react";

import { setStudentResourceSavedAction } from "@/modules/content/actions/student-saved-resource-actions";

export function StudentSaveResourceButton({
  resourceId,
  initialSaved,
  savedLabel = "Guardado",
  unsavedLabel = "Guardar",
}: {
  resourceId: string;
  initialSaved: boolean;
  savedLabel?: string;
  unsavedLabel?: string;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [feedback, setFeedback] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function toggleSaved() {
    if (isPending) return;
    const previous = saved;
    const next = !previous;
    setSaved(next);
    setFeedback("");
    setHasError(false);

    startTransition(async () => {
      try {
        const result = await setStudentResourceSavedAction({
          resourceId,
          saved: next,
        });
        if (result.status === "error") {
          setSaved(previous);
          setFeedback(result.message);
          setHasError(true);
          return;
        }

        setSaved(result.saved);
        setFeedback(
          result.saved ? "Recurso guardado." : "Recurso eliminado de guardados.",
        );
      } catch {
        setSaved(previous);
        setFeedback("No pudimos actualizar tus guardados. Inténtalo de nuevo.");
        setHasError(true);
      }
    });
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={toggleSaved}
        disabled={isPending}
        aria-pressed={saved}
        aria-label={saved ? "Quitar de guardados" : "Guardar recurso"}
        className={`inline-flex min-h-10 items-center gap-2 rounded-control border px-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${
          saved
            ? "border-gold/40 bg-gold-100 text-[#865d00] dark:bg-gold/15 dark:text-gold"
            : "border-line bg-surface text-ink-700 hover:bg-paper dark:border-[var(--student-border)] dark:bg-[var(--student-panel)] dark:text-[var(--student-text)] dark:hover:bg-[var(--student-bg)]"
        }`}
      >
        {isPending ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Bookmark
            aria-hidden="true"
            className={`size-4 ${saved ? "fill-current" : ""}`}
          />
        )}
        {saved ? savedLabel : unsavedLabel}
      </button>
      <p
        aria-live="polite"
        className={
          hasError
            ? "mt-1 max-w-52 text-xs leading-4 text-rose-700 dark:text-rose-300"
            : "sr-only"
        }
      >
        {feedback}
      </p>
    </div>
  );
}
