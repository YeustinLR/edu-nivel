import { Mail, Palette, UserRound } from "lucide-react";

import { Role } from "@/generated/prisma/enums";
import { ThemeToggle } from "@/modules/dashboard/components/layout/ThemeToggle";
import { LearnerPageHeader } from "@/modules/dashboard/components/learner/LearnerPageHeader";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import { getLearnerDashboardData } from "@/server/content/learner-dashboard-queries";

export default async function TeacherSettingsPage() {
  const data = await getLearnerDashboardData(Role.TEACHER);

  return (
    <div className="space-y-7">
      <LearnerPageHeader
        eyebrow="Cuenta docente"
        title="Configuración"
        description="Consulta tu información y adapta la apariencia de EduNivel."
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[1.35rem] border border-[var(--student-border)] bg-[var(--student-panel)] p-6 shadow-[0_5px_22px_rgba(15,23,42,0.035)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]"><UserRound aria-hidden="true" className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-[var(--student-text)]">Información docente</h2><p className="text-sm text-[var(--student-muted)]">Datos de tu cuenta autenticada</p></div>
          </div>
          <dl className="mt-6 divide-y divide-[var(--student-border)]">
            <div className="py-3"><dt className="text-xs font-bold uppercase tracking-wide text-[var(--student-muted)]">Nombre</dt><dd className="mt-1 font-semibold text-[var(--student-text)]">{data.user.name}</dd></div>
            <div className="py-3"><dt className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--student-muted)]"><Mail aria-hidden="true" className="h-3.5 w-3.5" />Correo</dt><dd className="mt-1 break-all font-semibold text-[var(--student-text)]">{data.user.email}</dd></div>
            <div className="py-3"><dt className="text-xs font-bold uppercase tracking-wide text-[var(--student-muted)]">Nivel actual</dt><dd className="mt-1 font-semibold text-[var(--student-text)]">{data.selectedLevel ? formatLearnerLevel(data.selectedLevel.levelNumber) : "Sin nivel seleccionado"}</dd></div>
          </dl>
        </section>
        <section className="rounded-[1.35rem] border border-[var(--student-border)] bg-[var(--student-panel)] p-6 shadow-[0_5px_22px_rgba(15,23,42,0.035)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Palette aria-hidden="true" className="h-5 w-5" /></span>
            <div><h2 className="font-bold text-[var(--student-text)]">Apariencia</h2><p className="text-sm text-[var(--student-muted)]">Tema claro u oscuro</p></div>
          </div>
          <div className="mt-6 rounded-xl border border-[var(--student-border)] bg-[var(--student-bg)] p-2 [&_button]:text-[var(--student-text)] [&_button:hover]:bg-[var(--student-soft)]">
            <ThemeToggle />
          </div>
        </section>
      </div>
    </div>
  );
}
