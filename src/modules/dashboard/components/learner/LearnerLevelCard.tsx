import { CheckCircle2, GraduationCap, LockKeyhole } from "lucide-react";

import { Role } from "@/generated/prisma/enums";
import { LearnerLevelPicker } from "@/modules/dashboard/components/learner/LearnerLevelPicker";
import type {
  LearnerDashboardData,
  LearnerRole,
} from "@/modules/dashboard/types/learner-dashboard";

export function LearnerLevelCard({
  data,
  role,
}: {
  data: LearnerDashboardData;
  role: LearnerRole;
}) {
  const hasAccess = data.access.status === "ACTIVE" || data.access.status === "INCLUDED";
  const levelHeading = hasAccess
    ? "Tu nivel actual"
    : data.access.status === "LOCKED"
      ? "Nivel por desbloquear"
      : "Sin nivel en uso";

  return (
    <section className="relative z-20 flex min-h-[204px] items-center rounded-[1.35rem] border border-[var(--student-border)] bg-[linear-gradient(135deg,var(--student-panel),color-mix(in_srgb,var(--student-panel)_78%,#eaf8e8))] p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)] sm:p-6">
      <div className="flex w-full items-center gap-4 sm:gap-5">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#e4f6df] text-[#24783c] dark:bg-emerald-500/15 dark:text-emerald-300 sm:h-20 sm:w-20">
          <GraduationCap aria-hidden="true" className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--student-muted)]">{levelHeading}</p>
          <LearnerLevelPicker
            levels={data.levels}
            selectedLevelId={data.selectedLevel?.id}
            returnTo={
              role === Role.STUDENT
                ? "/dashboard/student"
                : "/dashboard/teacher"
            }
            variant="card"
          />
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
