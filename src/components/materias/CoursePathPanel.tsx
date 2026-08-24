"use client";

import {
  BookOpenText,
  ChevronDown,
  CircleCheckBig,
  CirclePlay,
  FileText,
  LockKeyhole,
  PencilLine,
  type LucideIcon,
} from "lucide-react";
import { useId, useState } from "react";

import type {
  CourseModule,
  Lesson,
  LessonType,
} from "@/components/materias/types";

interface CoursePathPanelProps {
  title: string;
  modules: readonly CourseModule[];
  initialOpenModuleId: string;
  completionUnitLabel: string;
}

const lessonTypeIcons: Record<LessonType, LucideIcon> = {
  lesson: BookOpenText,
  video: CirclePlay,
  activity: PencilLine,
  pdf: FileText,
  quiz: CircleCheckBig,
};

function LessonPathItem({ lesson, isLast }: { lesson: Lesson; isLast: boolean }) {
  const TypeIcon = lessonTypeIcons[lesson.type];
  const isDone = lesson.status === "done";
  const isCurrent = lesson.status === "current";

  return (
    <li
      aria-current={isCurrent ? "step" : undefined}
      className={`relative grid grid-cols-[28px_minmax(0,1fr)] gap-2 pb-3 ${isLast ? "pb-0" : ""}`}
    >
      {!isLast ? (
        <span
          aria-hidden="true"
          className="absolute left-[13px] top-5 h-[calc(100%-8px)] w-px bg-line dark:bg-[var(--student-border)]"
        />
      ) : null}
      <span
        aria-hidden="true"
        className={`relative z-10 mt-0.5 flex size-5 items-center justify-center rounded-full border-2 bg-surface dark:bg-[var(--student-panel)] ${
          isDone
            ? "border-mint bg-mint text-white"
            : isCurrent
              ? "border-gold bg-gold-100 text-gold"
              : "border-line text-ink-500 dark:border-[var(--student-border)] dark:text-[var(--student-muted)]"
        }`}
      >
        {isDone ? <CircleCheckBig className="size-3.5" strokeWidth={3} /> : null}
        {isCurrent ? <span className="size-2 rounded-full bg-gold" /> : null}
        {lesson.status === "locked" ? <LockKeyhole className="size-2.5" /> : null}
      </span>
      <div className="min-w-0">
        <p className={`text-[13px] font-semibold leading-5 ${isCurrent ? "text-[#9a6500] dark:text-gold" : lesson.status === "locked" ? "text-ink-500 dark:text-[var(--student-muted)]" : "text-ink-900 dark:text-[var(--student-text)]"}`}>
          {lesson.title}
        </p>
        <p className="flex items-center gap-1.5 font-meta text-[10px] text-ink-500 dark:text-[var(--student-muted)]">
          <TypeIcon aria-hidden="true" className="size-3" />
          <span>{lesson.durationLabel}</span>
        </p>
      </div>
    </li>
  );
}

function ModuleAccordion({
  module,
  isOpen,
  onToggle,
  completionUnitLabel,
  idPrefix,
}: {
  module: CourseModule;
  isOpen: boolean;
  onToggle: () => void;
  completionUnitLabel: string;
  idPrefix: string;
}) {
  const buttonId = `${idPrefix}-button-${module.id}`;
  const panelId = `${idPrefix}-panel-${module.id}`;
  const moduleTone =
    module.order === 1
      ? "bg-gold-100 text-[#9a6500] dark:bg-gold/15 dark:text-gold"
      : module.order === 2
        ? "bg-mint-100 text-mint dark:bg-mint/15"
        : "bg-violet-100 text-violet dark:bg-violet/15 dark:text-[var(--student-blue)]";

  return (
    <div>
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
        >
          <span aria-hidden="true" className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] font-meta text-xs font-semibold ${moduleTone}`}>
            {String(module.order).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink-900 dark:text-[var(--student-text)]">{module.name}</span>
            <span className="block font-meta text-[10px] text-ink-500 dark:text-[var(--student-muted)]">
              {module.completedCount} de {module.totalCount} {completionUnitLabel}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 text-ink-500 transition-transform motion-reduce:transition-none dark:text-[var(--student-muted)] ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </h3>
      {isOpen ? (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="pb-3 pl-[18px] pr-1 pt-1">
          <ol>
            {module.lessons.map((lesson, index) => (
              <LessonPathItem
                key={lesson.id}
                lesson={lesson}
                isLast={index === module.lessons.length - 1}
              />
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

export function CoursePathPanel({
  title,
  modules,
  initialOpenModuleId,
  completionUnitLabel,
}: CoursePathPanelProps) {
  const generatedId = useId().replaceAll(":", "");
  const [openModuleIds, setOpenModuleIds] = useState<ReadonlySet<string>>(
    () => new Set([initialOpenModuleId]),
  );

  function toggleModule(moduleId: string) {
    setOpenModuleIds((current) => {
      const next = new Set(current);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  return (
    <aside className="rounded-card border border-line bg-surface p-4 shadow-sm dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]" aria-labelledby={`${generatedId}-title`}>
      <h2 id={`${generatedId}-title`} className="font-heading text-base font-bold text-ink-900 dark:text-[var(--student-text)]">{title}</h2>
      <div className="mt-4 space-y-1">
        {modules.map((module) => (
          <ModuleAccordion
            key={module.id}
            module={module}
            isOpen={openModuleIds.has(module.id)}
            onToggle={() => toggleModule(module.id)}
            completionUnitLabel={completionUnitLabel}
            idPrefix={generatedId}
          />
        ))}
      </div>
    </aside>
  );
}
