import { BookmarkMinus } from "lucide-react";

import { StudentSaveResourceButton } from "@/modules/content/components/student-content/StudentSaveResourceButton";
import { LearnerResourceCard } from "@/modules/dashboard/components/learner/LearnerDashboardCards";
import type { LearnerSavedResourceSummary } from "@/modules/dashboard/types/learner-dashboard";

function formatSavedDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeZone: "America/Costa_Rica",
  }).format(new Date(value));
}

export function StudentSavedResourceCard({
  resource,
}: {
  resource: LearnerSavedResourceSummary;
}) {
  return (
    <article className="space-y-2">
      <LearnerResourceCard resource={resource} />
      <div className="flex flex-col gap-2 rounded-[1rem] border border-[var(--student-border)] bg-[var(--student-panel)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-[var(--student-muted)]">
          <BookmarkMinus aria-hidden="true" className="h-4 w-4" />
          Guardado el {formatSavedDate(resource.savedAt)}
        </p>
        <StudentSaveResourceButton
          resourceId={resource.id}
          initialSaved
          savedLabel="Quitar"
          unsavedLabel="Guardar de nuevo"
        />
      </div>
    </article>
  );
}
