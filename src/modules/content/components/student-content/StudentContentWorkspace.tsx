"use client";

import {
  BookOpen,
  Check,
  ChevronDown,
  CircleCheckBig,
  FileText,
  GraduationCap,
  LockKeyhole,
  Play,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import {
  ResourceTypeIcon,
  resourceTypeLabels,
} from "@/modules/content/components/admin/ContentBadges";
import { StudentResourceViewer } from "@/modules/content/components/student-content/StudentResourceViewer";
import { ModuleResourcePanel } from "@/modules/content/components/shared/ModuleResourcePanel";
import type {
  StudentContentModule,
  StudentContentResourceSummary,
  StudentContentSubject,
  StudentContentWorkspaceData,
} from "@/modules/content/types/student-content";
import {
  formatLearnerLevel,
  formatResourceDuration,
} from "@/modules/dashboard/domain/learner-presentation";

function WorkspaceState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof GraduationCap;
  title: string;
  description: string;
  action: { href: string; label: string };
}) {
  return (
    <section className="flex min-h-[28rem] flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface px-6 text-center shadow-sm dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]">
      <span className="flex size-14 items-center justify-center rounded-[16px] bg-violet-100 text-violet dark:bg-violet/15 dark:text-[var(--student-blue)]">
        <Icon aria-hidden="true" className="size-7" />
      </span>
      <h1 className="mt-4 font-heading text-xl font-bold text-ink-900 dark:text-[var(--student-text)]">
        {title}
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-ink-500 dark:text-[var(--student-muted)]">
        {description}
      </p>
      <Link
        href={action.href}
        className="mt-5 inline-flex min-h-11 items-center rounded-control bg-violet px-5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
      >
        {action.label}
      </Link>
    </section>
  );
}

function SubjectSelector({
  subjects,
  selectedSubject,
}: {
  subjects: StudentContentSubject[];
  selectedSubject: StudentContentSubject;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative z-20 rounded-card border border-line bg-surface px-4 py-3 shadow-sm dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-violet dark:text-[var(--student-blue)]">
            Materia
          </span>
          <p className="mt-0.5 truncate font-heading text-lg font-bold text-ink-900 dark:text-[var(--student-text)]">
            {selectedSubject.name}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Seleccionar materia. Actual: ${selectedSubject.name}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-700 shadow-sm transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 dark:border-[var(--student-border)] dark:bg-[var(--student-panel)] dark:text-[var(--student-text)] dark:hover:bg-[var(--student-bg)]"
        >
          <ChevronDown
            aria-hidden="true"
            className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <div
        className={`absolute left-0 top-full z-30 mt-2 w-full transition-[opacity,transform,visibility] duration-200 ${
          open
            ? "visible translate-y-0 opacity-100"
            : "invisible pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <div className="rounded-[1.1rem] border border-line bg-[#f8f6ef] p-2 shadow-[0_12px_30px_rgba(15,23,42,0.08)] dark:border-[var(--student-border)] dark:bg-[var(--student-bg)]">
          <ul role="listbox" aria-label="Materias disponibles" className="space-y-1">
            {subjects.map((subject) => {
              const selected = subject.id === selectedSubject.id;
              return (
                <li key={subject.id}>
                  <Link
                    href={subject.href}
                    scroll={false}
                    role="option"
                    aria-selected={selected}
                    onClick={() => setOpen(false)}
                    className={`flex w-full items-center justify-between rounded-control px-3 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet ${
                      selected
                        ? "bg-ink-900 text-white dark:bg-violet"
                        : "text-ink-700 hover:bg-white dark:text-[var(--student-text)] dark:hover:bg-[var(--student-panel)]"
                    }`}
                  >
                    <span className="truncate">{subject.name}</span>
                    {selected ? <Check aria-hidden="true" className="size-4" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SubjectOverviewHero({
  subject,
  levelNumber,
  selectedModule,
  selectedResource,
}: {
  subject: StudentContentSubject;
  levelNumber: number;
  selectedModule: StudentContentModule | null;
  selectedResource: StudentContentResourceSummary | null;
}) {
  const resources = subject.modules.flatMap(
    (moduleRecord) => moduleRecord.resources,
  );
  const resourceCount = resources.length;
  const completedCount = resources.filter((resource) => resource.completed).length;
  const moduleResourceCount = selectedModule?.resources.length ?? 0;
  const moduleCompletedCount =
    selectedModule?.resources.filter((resource) => resource.completed).length ?? 0;
  const moduleProgress = moduleResourceCount
    ? Math.round((moduleCompletedCount / moduleResourceCount) * 100)
    : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const ringOffset =
    circumference - (Math.min(100, Math.max(0, moduleProgress)) / 100) * circumference;
  const eyebrow = selectedResource?.completed
    ? "Recurso completado"
    : selectedResource?.started
      ? "Continúa donde quedaste"
      : `Progreso · ${formatLearnerLevel(levelNumber)}`;

  return (
    <section className="relative overflow-hidden rounded-card bg-gradient-to-r from-ink-900 via-[#1a294d] to-[#22355f] px-5 py-6 text-white shadow-md sm:px-7">
      <div className="absolute -right-16 -top-20 size-64 rounded-full bg-gold/12 blur-3xl" />
      <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-2xl flex-1">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/75">
            <Play aria-hidden="true" className="size-3 fill-current" />
            {eyebrow}
          </p>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] sm:text-[1.7rem]">
            {selectedResource?.title ?? subject.name}
          </h1>
          {resourceCount ? (
            <div className="mt-4 flex max-w-md items-center gap-3">
              <progress
                value={completedCount}
                max={resourceCount}
                aria-label={`${completedCount} de ${resourceCount} recursos completados en ${subject.name}`}
                className="h-2 flex-1 appearance-none overflow-hidden rounded-full bg-white/20 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-gold [&::-webkit-progress-bar]:bg-white/20 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-gold"
              />
              <span className="font-meta text-xs text-white">
                {completedCount}/{resourceCount} recursos
              </span>
            </div>
          ) : null}
          {selectedResource ? (
            <a
              href="#resource-content"
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control bg-gold px-5 font-heading text-sm font-bold text-ink-900 shadow-sm transition-colors hover:bg-[#f4bf15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
            >
              <BookOpen aria-hidden="true" className="size-4" />
              {selectedResource.started ? "Reanudar recurso" : "Abrir recurso"}
            </a>
          ) : null}
        </div>

        {selectedModule ? (
          <div className="flex items-center gap-4 rounded-[16px] border border-white/10 bg-white/8 px-4 py-3">
            <div
              className="relative size-[86px] shrink-0"
              role="img"
              aria-label={`${moduleProgress}% completado en ${selectedModule.title}`}
            >
              <svg aria-hidden="true" viewBox="0 0 86 86" className="size-full -rotate-90">
                <circle cx="43" cy="43" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
                <circle
                  cx="43"
                  cy="43"
                  r={radius}
                  fill="none"
                  stroke="#0FA46F"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={ringOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <strong className="font-heading text-base text-white">
                  {moduleProgress}%
                </strong>
                <span className="text-[9px] text-white/70">módulo</span>
              </div>
            </div>
            <div className="min-w-0 max-w-44">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">
                Módulo actual
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-bold">
                {selectedModule.title}
              </p>
              <p className="mt-1 text-xs text-white/65">
                {moduleCompletedCount} de {moduleResourceCount} completados
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ResourcePathItem({
  resource,
  selected,
  last,
}: {
  resource: StudentContentResourceSummary;
  selected: boolean;
  last: boolean;
}) {
  const duration = formatResourceDuration(
    resource.estimatedMinutes,
    resource.durationSeconds,
  );

  return (
    <li className={`relative grid grid-cols-[28px_minmax(0,1fr)] gap-2 pb-3 ${last ? "pb-0" : ""}`}>
      {!last ? (
        <span
          aria-hidden="true"
          className="absolute left-[13px] top-5 h-[calc(100%-8px)] w-px bg-line dark:bg-[var(--student-border)]"
        />
      ) : null}
      <span
        aria-hidden="true"
        className={`relative z-10 mt-0.5 flex size-5 items-center justify-center rounded-full border-2 bg-surface dark:bg-[var(--student-panel)] ${
          resource.completed
            ? "border-mint bg-mint text-white"
            : selected
              ? "border-gold bg-gold-100 text-gold"
            : "border-line text-ink-500 dark:border-[var(--student-border)] dark:text-[var(--student-muted)]"
        }`}
      >
        {resource.completed ? (
          <CircleCheckBig className="size-3.5" strokeWidth={3} />
        ) : selected ? (
          <span className="size-2 rounded-full bg-gold" />
        ) : (
          <ResourceTypeIcon type={resource.type} className="size-2.5" />
        )}
      </span>
      <Link
        href={resource.href}
        scroll={false}
        aria-current={selected ? "page" : undefined}
        className="min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
      >
        <span
          className={`block text-[13px] font-semibold leading-5 transition-colors ${
            selected
              ? "text-[#9a6500] dark:text-gold"
              : "text-ink-900 hover:text-violet dark:text-[var(--student-text)] dark:hover:text-[var(--student-blue)]"
          }`}
        >
          {resource.title}
        </span>
        <span className="flex items-center gap-1.5 font-meta text-[10px] text-ink-500 dark:text-[var(--student-muted)]">
          <ResourceTypeIcon type={resource.type} className="size-3" />
          <span>{resourceTypeLabels[resource.type]}</span>
          {duration ? <span>· {duration}</span> : null}
        </span>
      </Link>
    </li>
  );
}

function ModuleAccordion({
  moduleRecord,
  index,
  open,
  selectedResourceId,
  onToggle,
  idPrefix,
}: {
  moduleRecord: StudentContentModule;
  index: number;
  open: boolean;
  selectedResourceId: string | null;
  onToggle: () => void;
  idPrefix: string;
}) {
  const buttonId = `${idPrefix}-button-${moduleRecord.id}`;
  const panelId = `${idPrefix}-panel-${moduleRecord.id}`;
  const tones = [
    "bg-gold-100 text-[#9a6500] dark:bg-gold/15 dark:text-gold",
    "bg-mint-100 text-mint dark:bg-mint/15",
    "bg-violet-100 text-violet dark:bg-violet/15 dark:text-[var(--student-blue)]",
  ];
  const completedCount = moduleRecord.resources.filter(
    (resource) => resource.completed,
  ).length;

  return (
    <div>
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-center gap-3 rounded-control px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2"
        >
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-[10px] font-meta text-xs font-semibold ${tones[index % tones.length]}`}>
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-ink-900 dark:text-[var(--student-text)]">
              {moduleRecord.title}
            </span>
            <span className="block font-meta text-[10px] text-ink-500 dark:text-[var(--student-muted)]">
              {completedCount} de {moduleRecord.resources.length} completados
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-4 shrink-0 text-ink-500 transition-transform dark:text-[var(--student-muted)] ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h3>
      <ModuleResourcePanel
        id={panelId}
        open={open}
        className="pb-3 pl-[18px] pr-1 pt-1"
      >
        {moduleRecord.resources.length ? (
          <ol aria-labelledby={buttonId}>
            {moduleRecord.resources.map((resource, resourceIndex) => (
              <ResourcePathItem
                key={resource.id}
                resource={resource}
                selected={resource.id === selectedResourceId}
                last={resourceIndex === moduleRecord.resources.length - 1}
              />
            ))}
          </ol>
        ) : (
          <p className="py-2 text-xs leading-5 text-ink-500 dark:text-[var(--student-muted)]">
            Este módulo todavía no tiene recursos publicados.
          </p>
        )}
      </ModuleResourcePanel>
    </div>
  );
}

function ResourcePathPanel({
  modules,
  selectedModuleId,
  selectedResourceId,
}: {
  modules: StudentContentModule[];
  selectedModuleId: string | null;
  selectedResourceId: string | null;
}) {
  const generatedId = useId().replaceAll(":", "");
  const [openModuleIds, setOpenModuleIds] = useState<ReadonlySet<string>>(
    () => new Set(selectedModuleId ? [selectedModuleId] : []),
  );

  return (
    <aside
      className="rounded-card border border-line bg-surface p-4 shadow-sm dark:border-[var(--student-border)] dark:bg-[var(--student-panel)] min-[1080px]:sticky min-[1080px]:top-24"
      aria-labelledby={`${generatedId}-title`}
    >
      <h2
        id={`${generatedId}-title`}
        className="font-heading text-base font-bold text-ink-900 dark:text-[var(--student-text)]"
      >
        Contenido de la materia
      </h2>
      <div className="mt-4 space-y-1">
        {modules.map((moduleRecord, index) => (
          <ModuleAccordion
            key={moduleRecord.id}
            moduleRecord={moduleRecord}
            index={index}
            open={openModuleIds.has(moduleRecord.id)}
            selectedResourceId={selectedResourceId}
            onToggle={() =>
              setOpenModuleIds((current) => {
                const next = new Set(current);
                if (next.has(moduleRecord.id)) next.delete(moduleRecord.id);
                else next.add(moduleRecord.id);
                return next;
              })
            }
            idPrefix={generatedId}
          />
        ))}
      </div>
    </aside>
  );
}

export function StudentContentWorkspace({
  data,
}: {
  data: StudentContentWorkspaceData;
}) {
  const previousResourceIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (data.status !== "READY" || !data.selectedResourceId) return;
    if (
      previousResourceIdRef.current &&
      previousResourceIdRef.current !== data.selectedResourceId
    ) {
      window.requestAnimationFrame(() =>
        document.getElementById("selected-resource-title")?.focus(),
      );
    }
    previousResourceIdRef.current = data.selectedResourceId;
  }, [data]);

  if (data.status === "NO_LEVEL") {
    return (
      <WorkspaceState
        icon={GraduationCap}
        title="Selecciona un nivel para abrir tus materias"
        description="El contenido educativo se organiza según el nivel que elijas y el acceso disponible en tu cuenta."
        action={{ href: "/dashboard/student/explore", label: "Explorar niveles" }}
      />
    );
  }

  if (data.status === "LOCKED") {
    return (
      <WorkspaceState
        icon={LockKeyhole}
        title={`El ${formatLearnerLevel(data.level.levelNumber).toLocaleLowerCase("es-CR")} necesita acceso activo`}
        description="Tu cuenta no tiene acceso vigente a los recursos de este nivel. Puedes revisar o renovar tu suscripción sin perder la selección del nivel."
        action={{ href: "/dashboard/subscription", label: "Ver suscripción" }}
      />
    );
  }

  if (!data.subjects.length || !data.selectedSubjectId) {
    return (
      <WorkspaceState
        icon={FileText}
        title="Todavía no hay materias disponibles"
        description="Las materias activas de tu nivel aparecerán aquí cuando su contenido esté disponible."
        action={{ href: "/dashboard/student/explore", label: "Explorar contenido" }}
      />
    );
  }

  const selectedSubject =
    data.subjects.find((subject) => subject.id === data.selectedSubjectId) ??
    data.subjects[0];
  const selectedModule = selectedSubject.modules.find(
    (moduleRecord) => moduleRecord.id === data.selectedModuleId,
  );

  return (
    <div className="space-y-5 font-body text-ink-900 dark:text-[var(--student-text)]">
      <SubjectSelector
        subjects={data.subjects}
        selectedSubject={selectedSubject}
      />

      {(data.requestedSubjectUnavailable || data.requestedResourceUnavailable) ? (
        <p
          role="status"
          className="rounded-control border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-200"
        >
          El contenido solicitado ya no está disponible. Mostramos el primer
          recurso publicado que puedes consultar.
        </p>
      ) : null}

      <SubjectOverviewHero
        subject={selectedSubject}
        levelNumber={data.level.levelNumber}
        selectedModule={selectedModule ?? null}
        selectedResource={
          selectedModule?.resources.find(
            (resource) => resource.id === data.selectedResourceId,
          ) ?? null
        }
      />

      <div className="grid items-start gap-5 min-[1080px]:grid-cols-[330px_minmax(0,1fr)]">
        <ResourcePathPanel
          key={`${selectedSubject.id}:${data.selectedModuleId ?? "empty"}`}
          modules={selectedSubject.modules}
          selectedModuleId={data.selectedModuleId}
          selectedResourceId={data.selectedResourceId}
        />
        <div id="resource-content" className="scroll-mt-6">
          {data.selectedResource && selectedModule ? (
            <StudentResourceViewer
              key={data.selectedResource.id}
              resource={data.selectedResource}
              moduleTitle={selectedModule.title}
              previous={data.previous}
              next={data.next}
              resourcePosition={data.resourcePosition}
              resourceCount={data.resourceCount}
              moduleResourcePosition={data.moduleResourcePosition}
              moduleResourceCount={data.moduleResourceCount}
              moduleResourceCompletion={selectedModule.resources.map(
                (resource) => resource.completed,
              )}
            />
          ) : (
            <section className="flex min-h-80 flex-col items-center justify-center rounded-card border border-dashed border-line bg-surface px-6 text-center shadow-sm dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]">
              <FileText aria-hidden="true" className="size-9 text-ink-500 dark:text-[var(--student-muted)]" />
              <h2 className="mt-4 font-heading text-lg font-bold text-ink-900 dark:text-[var(--student-text)]">
                Esta materia aún no tiene recursos publicados
              </h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-ink-500 dark:text-[var(--student-muted)]">
                Los recursos aparecerán aquí cuando estén activos y disponibles
                para estudiantes.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
