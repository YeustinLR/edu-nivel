import { Role } from "@/generated/prisma/enums";
import { LearnerLevelPicker } from "@/modules/dashboard/components/learner/LearnerLevelPicker";
import type { LearnerContentRole } from "@/server/content/learner-content-access";

type LevelOption = {
  id: string;
  levelNumber: number;
  description: string | null;
  requiresSubscription: boolean;
  isActive: boolean;
};

export function LearnerLevelSelector({
  levels,
  selectedLevelId,
  role,
  variant = "default",
}: {
  levels: LevelOption[];
  selectedLevelId?: string;
  role: LearnerContentRole;
  variant?: "default" | "learner";
}) {
  const roleRoot = role === Role.STUDENT ? "student" : "teacher";

  return (
    <div
      className={
        variant === "learner"
          ? "rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] p-5 shadow-[0_5px_22px_rgba(15,23,42,0.035)] sm:w-96"
          : "rounded-xl border border-border bg-card p-4 sm:w-80"
      }
    >
      <p className="mb-2 text-sm font-semibold text-[var(--student-text)]">
        Nivel seleccionado
      </p>
      <LearnerLevelPicker
        levels={levels}
        selectedLevelId={selectedLevelId}
        returnTo={`/dashboard/${roleRoot}/content`}
      />
      <p className="mt-2 text-xs text-[var(--student-muted)]">
        Solo se muestran niveles con acceso vigente.
      </p>
    </div>
  );
}
