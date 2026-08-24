"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import {
  recordStudentResourceViewedAction,
  setStudentResourceCompletedAction,
} from "@/modules/content/actions/student-resource-progress-actions";

const trackedResourceIds = new Set<string>();

export function StudentResourceProgressControl({
  resourceId,
  initialCompleted,
}: {
  resourceId: string;
  initialCompleted: boolean;
}) {
  const [completed, setCompleted] = useState(initialCompleted);
  const [feedback, setFeedback] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (trackedResourceIds.has(resourceId)) return;
    trackedResourceIds.add(resourceId);
    void recordStudentResourceViewedAction(resourceId)
      .then((result) => {
        if (result.status === "error") trackedResourceIds.delete(resourceId);
      })
      .catch(() => trackedResourceIds.delete(resourceId));
  }, [resourceId]);

  function toggleCompleted() {
    if (isPending) return;
    const previous = completed;
    const next = !previous;
    setCompleted(next);
    setFeedback("");
    setHasError(false);

    startTransition(async () => {
      try {
        const result = await setStudentResourceCompletedAction({
          resourceId,
          completed: next,
        });
        if (result.status === "error") {
          setCompleted(previous);
          setFeedback(result.message);
          setHasError(true);
          return;
        }

        setCompleted(result.completed);
        setFeedback(
          result.completed
            ? "Recurso marcado como completado."
            : "El recurso volvió a estar pendiente.",
        );
      } catch {
        setCompleted(previous);
        setFeedback("No pudimos actualizar tu progreso. Inténtalo de nuevo.");
        setHasError(true);
      }
    });
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={toggleCompleted}
        disabled={isPending}
        aria-pressed={completed}
        className={`inline-flex min-h-10 items-center gap-2 rounded-control px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 ${
          completed
            ? "bg-mint text-white"
            : "bg-mint-100 text-mint hover:bg-[#c7efda] dark:bg-mint/15 dark:hover:bg-mint/20"
        }`}
      >
        {isPending ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Check aria-hidden="true" className="size-4" strokeWidth={3} />
        )}
        {completed ? "Completado" : "Marcar como completado"}
      </button>
      <p
        aria-live="polite"
        className={
          hasError
            ? "mt-1 max-w-56 text-xs leading-4 text-rose-700 dark:text-rose-300"
            : "sr-only"
        }
      >
        {feedback}
      </p>
    </div>
  );
}
