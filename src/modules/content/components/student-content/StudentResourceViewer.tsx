import Link from "next/link";

import { LearnerResourcePresentation } from "@/modules/content/components/student-content/LearnerResourcePresentation";
import { StudentResourceProgressControl } from "@/modules/content/components/student-content/StudentResourceProgressControl";
import { StudentSaveResourceButton } from "@/modules/content/components/student-content/StudentSaveResourceButton";
import type {
  StudentContentNavigationTarget,
  StudentContentResourceDetail,
} from "@/modules/content/types/student-content";

export function StudentResourceViewer({
  resource,
  moduleTitle,
  previous,
  next,
  resourcePosition,
  resourceCount,
  moduleResourcePosition,
  moduleResourceCount,
  moduleResourceCompletion,
}: {
  resource: StudentContentResourceDetail;
  moduleTitle: string;
  previous: StudentContentNavigationTarget;
  next: StudentContentNavigationTarget;
  resourcePosition: number;
  resourceCount: number;
  moduleResourcePosition: number;
  moduleResourceCount: number;
  moduleResourceCompletion: boolean[];
}) {
  return (
    <LearnerResourcePresentation
      resource={resource}
      moduleTitle={moduleTitle}
      titleId="selected-resource-title"
      quizInteractive
      resourcePositionLabel={`Recurso ${resourcePosition} de ${resourceCount}`}
      headerActions={
        <>
          <StudentSaveResourceButton
            key={`${resource.id}:${resource.isSaved ? "saved" : "unsaved"}`}
            resourceId={resource.id}
            initialSaved={resource.isSaved}
          />
          <StudentResourceProgressControl
            key={`${resource.id}:${resource.isCompleted ? "completed" : "pending"}`}
            resourceId={resource.id}
            initialCompleted={resource.isCompleted}
          />
        </>
      }
      footer={
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div>
            {previous ? (
              <Link
                href={previous.href}
                scroll={false}
                className="inline-flex min-h-10 max-w-full items-center rounded-control border border-line px-3 text-sm font-semibold text-ink-700 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 dark:border-[var(--student-border)] dark:text-[var(--student-text)] dark:hover:bg-[var(--student-soft)]"
              >
                <span className="truncate">← {previous.title}</span>
              </Link>
            ) : null}
          </div>
          <div
            className="flex gap-1.5"
            role="list"
            aria-label={`Recurso ${moduleResourcePosition} de ${moduleResourceCount} en este módulo`}
          >
            {Array.from({ length: moduleResourceCount }, (_, index) => (
              <span
                key={index}
                role="listitem"
                aria-label={`Recurso ${index + 1}: ${
                  moduleResourceCompletion[index] ? "completado" : "pendiente"
                }${index + 1 === moduleResourcePosition ? ", actual" : ""}`}
                className={`h-1.5 rounded-full transition-[width,background-color] ${
                  moduleResourceCompletion[index]
                    ? `w-5 bg-mint ${
                        index + 1 === moduleResourcePosition
                          ? "ring-2 ring-gold/40 ring-offset-1"
                          : ""
                      }`
                    : index + 1 === moduleResourcePosition
                      ? "w-5 bg-gold"
                      : "w-1.5 bg-line dark:bg-[var(--student-border)]"
                }`}
              />
            ))}
          </div>
          <div className="text-right">
            {next ? (
              <Link
                href={next.href}
                scroll={false}
                className="inline-flex min-h-10 max-w-full items-center rounded-control bg-ink-900 px-4 text-sm font-bold text-white hover:bg-[#1f2b46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
              >
                <span className="truncate">{next.title} →</span>
              </Link>
            ) : null}
          </div>
        </div>
      }
    />
  );
}
