import { FileText, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { Role } from "@/generated/prisma/enums";
import { ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { LearnerLevelSelector } from "@/modules/content/components/learner/LearnerLevelSelector";
import { LearnerSubjectModules } from "@/modules/content/components/learner/LearnerSubjectModules";
import { getPremiumAccessDecision, requireUser } from "@/server/auth/guards";
import {
  getVisibleLearnerModuleWhere,
  getVisibleLearnerResourceWhere,
  type LearnerContentRole,
} from "@/server/content/learner-content-access";
import { getActiveAcademicLevels } from "@/server/content/published-academic-catalog-queries";
import { prisma } from "@/server/db/prisma";

export async function LearnerContent({
  role,
  presentation = "default",
  title = "Contenido educativo",
  description = "Elige un nivel y explora sus materias, módulos y recursos publicados.",
}: {
  role: LearnerContentRole;
  presentation?: "default" | "learner";
  title?: string;
  description?: string;
}) {
  const learner = presentation === "learner";
  const user = await requireUser();
  const levels = await getActiveAcademicLevels();
  const selectedLevel = levels.find((level) => level.id === user.selectedLevelId) ?? null;
  const access = selectedLevel ? await getPremiumAccessDecision(selectedLevel.id) : null;
  const canOpen = Boolean(access?.decision.allowed);
  const moduleWhere = getVisibleLearnerModuleWhere(role);
  const resourceWhere = getVisibleLearnerResourceWhere();

  const modules = selectedLevel && canOpen
    ? await prisma.module.findMany({
        where: {
          ...moduleWhere,
          subject: { levelId: selectedLevel.id, isActive: true },
        },
        orderBy: [{ subject: { order: "asc" } }, { order: "asc" }],
        select: {
          id: true,
          title: true,
          description: true,
          subject: { select: { id: true, name: true } },
          resources: {
            where: resourceWhere,
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              instructions: true,
              content: true,
              estimatedMinutes: true,
              type: true,
              youtubeVideo: { select: { videoId: true, startAt: true } },
              linkResource: { select: { url: true, openInNewTab: true } },
            },
          },
        },
      })
    : [];
  const subjects = Array.from(new Map(modules.map((module) => [module.subject.id, module.subject])).values());

  return (
    <div className={learner ? "space-y-7" : "space-y-8"}>
      {learner ? (
        <header>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--student-blue)]">
            {role === Role.TEACHER ? "Biblioteca docente" : "Biblioteca de aprendizaje"}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-[var(--student-text)] sm:text-4xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--student-muted)] sm:text-base">{description}</p>
        </header>
      ) : (
        <ContentPageHeader
          eyebrow={role === Role.STUDENT ? "Aprendizaje" : "Recursos docentes"}
          title={title}
          description={description}
        />
      )}

      <LearnerLevelSelector levels={levels} selectedLevelId={selectedLevel?.id} variant={learner ? "learner" : "default"} />

      {selectedLevel && !canOpen ? (
        <section className={learner ? "rounded-2xl border border-blue-200/70 bg-[var(--student-blue-soft)] p-6 dark:border-blue-400/15" : "rounded-2xl border border-secondary/30 bg-secondary/10 p-6"}>
          <LockKeyhole aria-hidden="true" className={learner ? "h-7 w-7 text-[var(--student-blue)]" : "h-7 w-7 text-secondary"} />
          <h2 className={learner ? "mt-4 text-lg font-bold text-[var(--student-text)]" : "mt-4 text-lg font-semibold text-foreground"}>Este nivel necesita una suscripción activa</h2>
          <p className={learner ? "mt-1 max-w-2xl text-sm leading-6 text-[var(--student-muted)]" : "mt-1 max-w-2xl text-sm leading-6 text-muted"}>La compra desbloquea todas sus materias, módulos y recursos publicados.</p>
          <Link href="/dashboard/subscription" className={learner ? "mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--student-blue)] px-4 py-2 text-sm font-bold text-white" : "mt-4 inline-flex min-h-11 items-center rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white"}>Ver planes</Link>
        </section>
      ) : null}

      {selectedLevel && canOpen ? (
        <div className="space-y-10">
          {subjects.map((subject) => (
            <section key={subject.id} aria-labelledby={`subject-${subject.id}`} className="scroll-mt-32 space-y-4">
              <div><p className={learner ? "text-xs font-bold uppercase tracking-[0.14em] text-[var(--student-blue)]" : "text-xs font-semibold uppercase tracking-[0.14em] text-secondary"}>Nivel {selectedLevel.levelNumber}</p><h2 id={`subject-${subject.id}`} className={learner ? "mt-1 text-2xl font-bold tracking-[-0.025em] text-[var(--student-text)]" : "mt-1 text-xl font-semibold text-foreground"}>{subject.name}</h2></div>
              <LearnerSubjectModules
                modules={modules.filter((module) => module.subject.id === subject.id)}
                variant={learner ? "learner" : "default"}
              />
            </section>
          ))}
          {modules.length === 0 ? (
            <div className={learner ? "rounded-2xl border border-dashed border-[var(--student-border)] bg-[var(--student-panel)] px-6 py-14 text-center" : "rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center"}><FileText aria-hidden="true" className={learner ? "mx-auto h-9 w-9 text-[var(--student-muted)]" : "mx-auto h-9 w-9 text-muted"} /><h2 className={learner ? "mt-4 font-bold text-[var(--student-text)]" : "mt-4 font-semibold text-foreground"}>Todavía no hay contenido publicado</h2><p className={learner ? "mt-1 text-sm text-[var(--student-muted)]" : "mt-1 text-sm text-muted"}>Los módulos disponibles para este nivel y audiencia aparecerán aquí.</p></div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
