"use client";

import { CoursePathPanel } from "@/components/materias/CoursePathPanel";
import { LessonContentPane } from "@/components/materias/LessonContentPane";
import { LessonHero } from "@/components/materias/LessonHero";
import { ChevronDown, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  courseModules,
  lessonContent,
  weeklyDays,
} from "@/components/materias/materias-example-data";

const availableSubjects = [
  "Matemáticas",
  "Español",
  "Estudios Sociales",
  "Ciencias",
] as const;

export function MateriasLessonView() {
  const [selectedSubject, setSelectedSubject] = useState<(typeof availableSubjects)[number]>(availableSubjects[0]);
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false);
  const subjectMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!subjectMenuRef.current) return;
      if (!subjectMenuRef.current.contains(event.target as Node)) {
        setIsSubjectMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSubjectMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="space-y-5 font-body text-ink-900 dark:text-[var(--student-text)]">
      <section
        ref={subjectMenuRef}
        className="relative z-20 rounded-card border border-line bg-surface px-4 py-3 shadow-sm dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--student-blue)]">
            Materia
          </span>
          <button
            type="button"
            aria-label={`Seleccionar materia. Actual: ${selectedSubject}`}
            aria-expanded={isSubjectMenuOpen}
            aria-haspopup="listbox"
            onClick={() => setIsSubjectMenuOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface text-ink-700 shadow-sm transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface dark:border-[var(--student-border)] dark:bg-[var(--student-panel)] dark:text-[var(--student-text)] dark:hover:bg-[var(--student-bg)]"
          >
            <ChevronDown aria-hidden="true" className={`size-4 transition-transform duration-200 ${isSubjectMenuOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        <div
          className={`absolute left-0 top-full z-30 mt-2 w-full transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${
            isSubjectMenuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0 pointer-events-none"
          }`}
        >
          <div className="rounded-[1.1rem] border border-line bg-[#f8f6ef] p-2 shadow-[0_12px_30px_rgba(15,23,42,0.06)] dark:border-[var(--student-border)] dark:bg-[var(--student-bg)]">
            <ul role="listbox" aria-label="Materias disponibles" className="space-y-1">
              {availableSubjects.map((subject) => {
                const isSelected = subject === selectedSubject;
                return (
                  <li key={subject}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedSubject(subject);
                        setIsSubjectMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-blue)] ${
                        isSelected
                          ? "bg-ink-900 text-white dark:bg-violet"
                          : "text-ink-700 hover:bg-white dark:text-[var(--student-text)] dark:hover:bg-[var(--student-panel)]"
                      }`}
                    >
                      <span>{subject}</span>
                      {isSelected ? <Check aria-hidden="true" className="size-4" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <LessonHero
        eyebrow="Continúa donde quedaste"
        title="Operaciones con números enteros"
        completedLessons={4}
        totalLessons={6}
        resumeLabel="Reanudar lección"
        resumeHref="#lesson-content"
        weeklyGoalLabel="Meta semanal"
        weeklyDays={weeklyDays}
        moduleProgress={67}
        moduleLabel={`${selectedSubject} · Módulo 1`}
      />

      <div className="grid items-start gap-5 min-[1080px]:grid-cols-[330px_minmax(0,1fr)]">
        <CoursePathPanel
          title="Contenido del curso"
          modules={courseModules}
          initialOpenModuleId="integers"
          completionUnitLabel="completadas"
        />
        <div id="lesson-content" className="scroll-mt-6">
          <LessonContentPane
            lessonLabel="Lección"
            moduleLabel="Módulo 1 · Números enteros"
            title="Operaciones con números enteros"
            durationLabel="8 min de lectura"
            positionLabel="3 de 6"
            saveLabel="Guardar lección"
            savedLabel="Quitar de guardados"
            moreOptionsLabel="Más opciones de la lección"
            completeLabel="Marcar como completado"
            completedLabel="Lección completada"
            initialSaved={false}
            initialCompleted={false}
            content={lessonContent}
            previous={{ label: "Anterior", href: "#lesson-content" }}
            next={{ label: "Siguiente: Ejercicios", href: "#lesson-content" }}
            totalSteps={6}
            currentStep={3}
          />
        </div>
      </div>
    </div>
  );
}
