import { Flame } from "lucide-react";

import { getLearnerStreakColorLevel } from "@/modules/dashboard/domain/learner-streak";

const darkTones = [
  "border-orange-300/15 bg-orange-400/10 text-orange-300",
  "border-amber-300/20 bg-amber-400/15 text-amber-300",
  "border-rose-300/20 bg-rose-400/15 text-rose-300",
  "border-fuchsia-300/20 bg-fuchsia-400/15 text-fuchsia-300",
  "border-violet-300/25 bg-violet-400/20 text-violet-200",
];

const lightTones = [
  "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-300/15 dark:bg-orange-400/10 dark:text-orange-300",
  "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-300/20 dark:bg-amber-400/15 dark:text-amber-300",
  "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-300/20 dark:bg-rose-400/15 dark:text-rose-300",
  "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-600 dark:border-fuchsia-300/20 dark:bg-fuchsia-400/15 dark:text-fuchsia-300",
  "border-violet-200 bg-violet-50 text-violet-600 dark:border-violet-300/25 dark:bg-violet-400/20 dark:text-violet-200",
];

export function LearnerStreakBadge({
  days,
  tone = "dark",
}: {
  days: number;
  tone?: "dark" | "light";
}) {
  const safeDays = Math.max(0, days);
  const colorLevel = getLearnerStreakColorLevel(safeDays);
  const colorClass = (tone === "dark" ? darkTones : lightTones)[colorLevel];
  const nextColorIn = 5 - (safeDays % 5);
  const encouragement =
    safeDays === 0
      ? "Empieza tu racha hoy"
      : colorLevel === 4
        ? "¡Racha legendaria!"
        : nextColorIn === 1
          ? "Nuevo color mañana"
          : `Nuevo color en ${nextColorIn} días`;

  return (
    <div
      aria-label={`Racha actual: ${safeDays} ${safeDays === 1 ? "día" : "días"}`}
      className={`rounded-control border px-4 py-3 shadow-sm transition-colors ${colorClass}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-current/10">
          <Flame aria-hidden="true" className="size-5" fill="currentColor" />
        </span>
        <div className="min-w-0">
          <p className={`font-heading text-sm font-extrabold ${tone === "dark" ? "text-white" : "text-[var(--student-text)]"}`}>
            {safeDays} {safeDays === 1 ? "día" : "días"}
          </p>
          <p className={`text-[11px] ${tone === "dark" ? "text-white/60" : "text-[var(--student-muted)]"}`}>
            {encouragement}
          </p>
        </div>
      </div>
    </div>
  );
}
