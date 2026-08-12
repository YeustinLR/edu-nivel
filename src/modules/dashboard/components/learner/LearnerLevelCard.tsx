"use client";

import { CheckCircle2, GraduationCap, LockKeyhole } from "lucide-react";
import { useFormStatus } from "react-dom";

import { selectLevelAction } from "@/modules/content/actions/content-actions";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import type { LearnerDashboardData } from "@/modules/dashboard/types/learner-dashboard";

function LevelSelect({
  levels,
  selectedLevelId,
}: {
  levels: LearnerDashboardData["levels"];
  selectedLevelId?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <label className="relative block">
      <span className="sr-only">Cambiar nivel actual</span>
      <select
        name="levelId"
        defaultValue={selectedLevelId ?? ""}
        required
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="max-w-full cursor-pointer appearance-none bg-transparent pr-7 text-lg font-bold tracking-[-0.025em] text-[var(--student-text)] outline-none disabled:cursor-wait disabled:opacity-60"
      >
        <option value="" disabled>Selecciona tu nivel</option>
        {levels.map((level) => (
          <option key={level.id} value={level.id}>
            {formatLearnerLevel(level.levelNumber)}
            {!level.requiresSubscription ? " — Gratuito" : ""}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-[var(--student-muted)]">⌄</span>
      <span className="sr-only" aria-live="polite">{pending ? "Cambiando nivel" : ""}</span>
    </label>
  );
}

export function LearnerLevelCard({ data }: { data: LearnerDashboardData }) {
  const hasAccess = data.access.status === "ACTIVE" || data.access.status === "INCLUDED";
  const levelHeading = hasAccess
    ? "Tu nivel actual"
    : data.access.status === "LOCKED"
      ? "Nivel por desbloquear"
      : "Sin nivel en uso";

  return (
    <section className="flex min-h-[204px] items-center rounded-[1.35rem] border border-[var(--student-border)] bg-[linear-gradient(135deg,var(--student-panel),color-mix(in_srgb,var(--student-panel)_78%,#eaf8e8))] p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)] sm:p-6">
      <div className="flex w-full items-center gap-5">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#e4f6df] text-[#24783c] dark:bg-emerald-500/15 dark:text-emerald-300">
          <GraduationCap aria-hidden="true" className="h-10 w-10" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--student-muted)]">{levelHeading}</p>
          <form action={selectLevelAction} className="mt-1.5">
            <LevelSelect levels={data.levels} selectedLevelId={data.selectedLevel?.id} />
          </form>
          <span className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${hasAccess ? "bg-[#e7f7e5] text-[#24733a] dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"}`}>
            {hasAccess ? <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> : <LockKeyhole aria-hidden="true" className="h-4 w-4" />}
            {data.access.status === "ACTIVE"
              ? "Suscripción activa"
              : data.access.status === "INCLUDED"
                ? "Acceso incluido"
                : data.access.status === "NO_LEVEL"
                  ? "Selecciona un nivel"
                  : "Sin suscripción activa"}
          </span>
        </div>
      </div>
    </section>
  );
}
