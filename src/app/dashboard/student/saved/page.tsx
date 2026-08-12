import { Bookmark } from "lucide-react";

import { LearnerPageHeader } from "@/modules/dashboard/components/learner/LearnerPageHeader";

export default function StudentSavedPage() {
  return (
    <div className="space-y-7">
      <LearnerPageHeader
        eyebrow="Tu biblioteca"
        title="Guardados"
        description="Un espacio preparado para reunir los recursos que quieras consultar más tarde."
      />
      <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--student-border)] bg-[var(--student-panel)] px-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]"><Bookmark aria-hidden="true" className="h-7 w-7" /></span>
        <h2 className="mt-4 text-lg font-bold text-[var(--student-text)]">No hay recursos guardados</h2>
        <p className="mt-1 max-w-md text-sm leading-6 text-[var(--student-muted)]">La función de favoritos persistentes todavía no existe en EduNivel. No mostramos contenido simulado.</p>
      </div>
    </div>
  );
}
