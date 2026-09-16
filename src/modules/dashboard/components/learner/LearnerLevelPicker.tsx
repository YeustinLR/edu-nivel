"use client";

import {
  Check,
  ChevronDown,
  GraduationCap,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { selectLevelAction } from "@/modules/content/actions/content-actions";
import { formatLearnerLevel } from "@/modules/dashboard/domain/learner-presentation";
import type { LearnerDashboardData } from "@/modules/dashboard/types/learner-dashboard";

type LevelOption = LearnerDashboardData["levels"][number];

function LevelPickerControl({
  levels,
  selectedLevelId,
  variant,
}: {
  levels: LevelOption[];
  selectedLevelId?: string;
  variant: "card" | "panel";
}) {
  const { pending } = useFormStatus();
  const [open, setOpen] = useState(false);
  const [optimisticLevelId, setOptimisticLevelId] = useState(
    selectedLevelId ?? "",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selectedLevel =
    levels.find((level) => level.id === optimisticLevelId) ?? null;

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const compact = variant === "card";
  const disabled = pending || levels.length === 0;

  return (
    <div ref={rootRef} className={`relative ${open ? "z-50" : ""}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`group flex w-full items-center gap-3 rounded-xl border text-left outline-none transition-all focus-visible:border-[var(--student-blue)] focus-visible:ring-4 focus-visible:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60 ${
          compact
            ? "mt-2 border-[var(--student-border)] bg-white/75 px-3 py-2.5 shadow-sm hover:border-blue-300 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
            : "min-h-14 border-[var(--student-border)] bg-[var(--student-bg)] px-3.5 py-2.5 hover:border-blue-300 hover:bg-[var(--student-blue-soft)]"
        }`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--student-blue-soft)] text-[var(--student-blue)]">
          {pending ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <GraduationCap aria-hidden="true" className="h-4.5 w-4.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-5 text-[var(--student-text)]">
            {selectedLevel
              ? formatLearnerLevel(selectedLevel.levelNumber)
              : levels.length
                ? "Selecciona un nivel"
                : "No hay niveles con acceso"}
          </span>
          <span className="mt-0.5 block text-xs leading-4 text-[var(--student-muted)]">
            {pending
              ? "Actualizando contenido…"
              : selectedLevel && !selectedLevel.isActive
                ? "Archivado · acceso vigente"
                : selectedLevel?.requiresSubscription
                ? "Acceso vigente"
                : selectedLevel
                  ? "Acceso incluido"
                  : "Adquiere o activa un nivel para verlo aquí"}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4.5 w-4.5 shrink-0 text-[var(--student-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Niveles con acceso vigente"
          className="absolute right-0 z-50 mt-2 max-h-80 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] p-2 shadow-[0_22px_60px_rgba(15,23,42,0.22)] ring-1 ring-black/5 sm:left-0 sm:right-auto"
        >
          <div className="px-2.5 pb-2 pt-1">
            <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-[var(--student-muted)]">
              Tus niveles disponibles
            </p>
          </div>
          <div className="space-y-1">
            {levels.map((level) => {
              const selected = level.id === optimisticLevelId;

              return (
                <button
                  key={level.id}
                  type="submit"
                  name="levelId"
                  value={level.id}
                  role="option"
                  aria-selected={selected}
                  disabled={pending}
                  onClick={() => {
                    setOptimisticLevelId(level.id);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--student-blue)] ${
                    selected
                      ? "bg-[var(--student-blue-soft)]"
                      : "hover:bg-[var(--student-bg)]"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold ${
                      selected
                        ? "bg-[var(--student-blue)] text-white"
                        : "bg-[var(--student-bg)] text-[var(--student-blue)]"
                    }`}
                  >
                    {level.levelNumber}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold leading-5 text-[var(--student-text)]">
                      {formatLearnerLevel(level.levelNumber)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-4 text-[var(--student-muted)]">
                      {!level.isActive
                        ? "Archivado · disponible hasta tu vencimiento"
                        : level.requiresSubscription
                        ? "Suscripción con acceso vigente"
                        : "Disponible sin suscripción"}
                    </span>
                  </span>
                  {selected ? (
                    <Check
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[var(--student-blue)]"
                      strokeWidth={3}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {pending ? "Cambiando nivel" : ""}
      </span>
    </div>
  );
}

export function LearnerLevelPicker({
  levels,
  selectedLevelId,
  returnTo,
  variant = "panel",
}: {
  levels: LevelOption[];
  selectedLevelId?: string;
  returnTo: string;
  variant?: "card" | "panel";
}) {
  return (
    <form action={selectLevelAction}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <LevelPickerControl
        key={selectedLevelId ?? "no-level"}
        levels={levels}
        selectedLevelId={selectedLevelId}
        variant={variant}
      />
    </form>
  );
}
