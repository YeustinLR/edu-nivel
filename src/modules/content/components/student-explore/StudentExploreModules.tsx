import { Info, LockKeyhole } from "lucide-react";

import { ResourceTypeIcon, resourceTypeLabels } from "@/modules/content/components/admin/ContentBadges";
import type { StudentExploreSubject } from "@/modules/content/types/student-explore";

export function StudentExploreModules({
  subject,
  hasAccess,
}: {
  subject: StudentExploreSubject | null;
  hasAccess: boolean;
}) {
  const modules = subject?.modules.slice(0, 3) ?? [];

  return (
    <section id="explore-modules" className="scroll-mt-32">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold tracking-[-0.025em] text-[var(--student-text)]">
            Módulos del nivel
          </h2>
          {subject ? (
            <p className="mt-1 text-sm font-medium text-[var(--student-muted)]">
              {subject.name}
            </p>
          ) : null}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-[var(--student-muted)]">
          <Info aria-hidden="true" className="h-4 w-4" />
          Vista previa de metadata. El contenido se abre desde Materias.
        </p>
      </div>

      {!subject ? (
        <div className="rounded-[1.25rem] border border-dashed border-[var(--student-border)] bg-[var(--student-panel)] px-6 py-10 text-center">
          <p className="font-bold text-[var(--student-text)]">Este nivel todavía no tiene materias activas</p>
          <p className="mt-1 text-sm text-[var(--student-muted)]">Los módulos aparecerán cuando se publique su estructura.</p>
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-[var(--student-border)] bg-[var(--student-panel)] px-6 py-10 text-center">
          <p className="font-bold text-[var(--student-text)]">Esta materia aún no tiene módulos publicados</p>
          <p className="mt-1 text-sm text-[var(--student-muted)]">No mostramos borradores ni contenido en revisión.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {modules.map((moduleRecord, moduleIndex) => (
            <article key={moduleRecord.id} className="rounded-[1.25rem] border border-[var(--student-border)] bg-[var(--student-panel)] p-4 shadow-[0_5px_22px_rgba(15,23,42,0.035)]">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--student-blue-soft)] text-sm font-extrabold text-[var(--student-blue)]">
                  {moduleIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 font-bold text-[var(--student-text)]">{moduleRecord.title}</h3>
                  <p className="mt-1 text-xs text-[var(--student-muted)]">{moduleRecord.resourceCount} {moduleRecord.resourceCount === 1 ? "recurso" : "recursos"}</p>
                </div>
              </div>

              {moduleRecord.resources.length ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
                  {moduleRecord.resources.slice(0, 3).map((resource) => (
                    <div key={resource.id} className="flex min-h-16 items-center gap-3 rounded-xl border border-[var(--student-border)] bg-[var(--student-bg)] px-3 py-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--student-blue-soft)] text-[var(--student-blue)]">
                        <ResourceTypeIcon type={resource.type} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-[var(--student-muted)]">
                          {!hasAccess ? <LockKeyhole aria-hidden="true" className="h-3 w-3" /> : null}
                          {resourceTypeLabels[resource.type]}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs font-semibold leading-4 text-[var(--student-text)]">{resource.title}</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[var(--student-border)] px-3 py-5 text-center text-xs text-[var(--student-muted)]">
                  Sin recursos Student publicados
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {subject && subject.modules.length > 3 ? (
        <p className="mt-3 text-center text-xs font-semibold text-[var(--student-muted)]">
          +{subject.modules.length - 3} módulos adicionales disponibles dentro de la materia
        </p>
      ) : null}
    </section>
  );
}
