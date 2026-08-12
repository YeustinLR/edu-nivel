"use client";

import { useFormStatus } from "react-dom";

import { selectLevelAction } from "@/modules/content/actions/content-actions";

type LevelOption = {
  id: string;
  levelNumber: number;
  requiresSubscription: boolean;
};

function LevelSelect({ levels, selectedLevelId, student }: { levels: LevelOption[]; selectedLevelId?: string; student: boolean }) {
  const { pending } = useFormStatus();

  return (
    <label className={`block space-y-1.5 text-sm font-medium ${student ? "text-[var(--student-text)]" : "text-foreground"}`}>
      Nivel seleccionado
      <select
        name="levelId"
        defaultValue={selectedLevelId ?? ""}
        required
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className={student
          ? "min-h-12 w-full rounded-xl border border-[var(--student-border)] bg-[var(--student-panel)] px-4 py-2.5 text-sm font-medium text-[var(--student-text)] outline-none transition focus-visible:border-[var(--student-blue)] focus-visible:ring-2 focus-visible:ring-blue-500/15 disabled:opacity-60 sm:min-w-72"
          : "min-h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus-visible:border-secondary focus-visible:ring-2 focus-visible:ring-secondary/20 disabled:opacity-60 sm:min-w-64"}
      >
        <option value="" disabled>Selecciona un nivel</option>
        {levels.map((level) => (
          <option key={level.id} value={level.id}>
            Nivel {level.levelNumber}{!level.requiresSubscription ? " — Gratuito" : ""}
          </option>
        ))}
      </select>
      <span aria-live="polite" className={`block min-h-4 text-xs font-normal ${student ? "text-[var(--student-muted)]" : "text-muted"}`}>
        {pending ? "Abriendo nivel…" : "El contenido cambia automáticamente."}
      </span>
    </label>
  );
}

export function LearnerLevelSelector({ levels, selectedLevelId, variant = "default" }: { levels: LevelOption[]; selectedLevelId?: string; variant?: "default" | "learner" }) {
  const student = variant === "learner";
  return (
    <form action={selectLevelAction} className={student ? "rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] p-5 shadow-[0_5px_22px_rgba(15,23,42,0.035)] sm:w-fit" : "rounded-xl border border-border bg-card p-4 sm:w-fit"}>
      <LevelSelect levels={levels} selectedLevelId={selectedLevelId} student={student} />
    </form>
  );
}
