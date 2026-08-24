"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  Crown,
  GraduationCap,
  LibraryBig,
  LockKeyhole,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { enterStudentLevelAction } from "@/modules/content/actions/content-actions";
import { resourceTypeLabels } from "@/modules/content/components/admin/ContentBadges";
import { StudentExploreModules } from "@/modules/content/components/student-explore/StudentExploreModules";
import {
  studentExploreNavigateEvent,
  type StudentExploreNavigateDetail,
} from "@/modules/content/domain/student-explore-navigation";
import { LearnerSubjectCard } from "@/modules/dashboard/components/learner/LearnerDashboardCards";
import type {
  EducationStage,
  StudentExploreData,
  StudentExploreLevelDetail,
  StudentExploreLevelSummary,
} from "@/modules/content/types/student-explore";

const levelTones = [
  { icon: "bg-blue-600", border: "border-blue-500", soft: "bg-blue-50/70 dark:bg-blue-500/8" },
  { icon: "bg-emerald-600", border: "border-emerald-500", soft: "bg-emerald-50/65 dark:bg-emerald-500/8" },
  { icon: "bg-violet-600", border: "border-violet-500", soft: "bg-violet-50/65 dark:bg-violet-500/8" },
  { icon: "bg-amber-500", border: "border-amber-500", soft: "bg-amber-50/65 dark:bg-amber-500/8" },
  { icon: "bg-rose-500", border: "border-rose-500", soft: "bg-rose-50/65 dark:bg-rose-500/8" },
] as const;

function exploreUrl(stage: EducationStage, levelId?: string, subjectId?: string) {
  const params = new URLSearchParams({ stage });
  if (levelId) params.set("level", levelId);
  if (subjectId) params.set("subject", subjectId);
  return `/dashboard/student/explore?${params.toString()}${subjectId ? "#explore-modules" : ""}`;
}

function LevelCard({
  level,
  index,
  selected,
  disabled,
  onSelect,
}: {
  level: StudentExploreLevelSummary;
  index: number;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const tone = levelTones[index % levelTones.length];
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`group flex min-h-[182px] w-[250px] shrink-0 snap-start flex-col rounded-[1.15rem] border bg-[var(--student-panel)] p-4 text-left shadow-[0_4px_18px_rgba(15,23,42,0.035)] transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-blue)] sm:w-[255px] ${selected ? `${tone.border} ${tone.soft} shadow-[0_10px_28px_rgba(23,104,229,0.09)]` : "border-[var(--student-border)] hover:border-blue-300/70 hover:shadow-[0_9px_25px_rgba(15,23,42,0.065)]"} disabled:cursor-wait`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-lg ${tone.icon}`}>
          <GraduationCap aria-hidden="true" className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate font-extrabold tracking-[-0.02em] text-[var(--student-text)]">{level.name}</h3>
          {level.access.status === "ACTIVE" || level.access.status === "INCLUDED" || level.access.status === "CANCELED_ACTIVE" ? (
            <span className="mt-1 inline-flex items-center gap-1 text-[0.68rem] font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />Acceso disponible</span>
          ) : null}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-[var(--student-border)] text-center">
        {[
          [level.subjectCount, level.subjectCount === 1 ? "materia" : "materias"],
          [level.moduleCount, level.moduleCount === 1 ? "módulo" : "módulos"],
          [level.resourceCount, level.resourceCount === 1 ? "recurso" : "recursos"],
        ].map(([value, label]) => (
          <div key={label} className="px-1"><dt className="text-sm font-extrabold text-[var(--student-text)]">{value}</dt><dd className="mt-0.5 text-[0.65rem] text-[var(--student-muted)]">{label}</dd></div>
        ))}
      </dl>
      <p className="mt-3 min-h-4 truncate text-center text-[0.68rem] text-[var(--student-muted)]">
        {level.resourceTypes.length
          ? <>{level.resourceTypes.map((type) => resourceTypeLabels[type]).join(" · ")}{level.additionalResourceTypeCount ? ` · +${level.additionalResourceTypeCount}` : ""}</>
          : "Sin recursos publicados"}
      </p>
      <span className="mt-auto flex items-center justify-center gap-2 border-t border-[var(--student-border)] pt-3 text-xs font-extrabold text-[var(--student-blue)]">
        Ver contenido <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function PreviewIllustration({ levelNumber }: { levelNumber: number }) {
  return (
    <div aria-hidden="true" className="relative min-h-[150px] overflow-hidden lg:min-h-[190px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_63%)]" />
      <Sparkles className="absolute right-[12%] top-[18%] h-7 w-7 text-blue-300/55" />
      <LibraryBig className="absolute bottom-[18%] left-[8%] h-16 w-16 text-blue-300/35" strokeWidth={1.1} />
      <Ruler className="absolute bottom-[10%] right-[12%] h-24 w-24 rotate-[-12deg] text-emerald-500/55" strokeWidth={1.4} />
      <div className="absolute bottom-[13%] left-1/2 h-32 w-28 -translate-x-1/2 rotate-[-4deg] rounded-[1rem] bg-gradient-to-br from-blue-500 to-blue-800 p-4 text-white shadow-[0_22px_38px_rgba(37,99,235,0.25)]">
        <span className="text-4xl font-black">{levelNumber}°</span>
        <span className="mt-4 block h-1.5 w-14 rounded bg-white/60" />
        <span className="mt-2 block h-1.5 w-9 rounded bg-white/35" />
      </div>
      <div className="absolute bottom-[13%] left-[36%] h-4 w-32 rotate-[-5deg] rounded bg-amber-400 shadow-sm" />
      <div className="absolute bottom-[8%] left-[34%] h-4 w-36 rotate-2 rounded bg-orange-300 shadow-sm" />
    </div>
  );
}

function accessPresentation(level: StudentExploreLevelSummary) {
  const access = level.access;
  if (access.status === "INCLUDED") return { badge: "Acceso incluido", active: true };
  if (access.status === "ACTIVE") return { badge: "Acceso activo", active: true };
  if (access.status === "CANCELED_ACTIVE") return { badge: "Acceso vigente", active: true };
  if (access.status === "PENDING") return { badge: "Pago en proceso", active: false };
  if (access.status === "EXPIRED") return { badge: "Acceso vencido", active: false };
  return { badge: "Premium", active: false };
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-CR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}

function LevelPreview({ level }: { level: NonNullable<StudentExploreData["selectedLevel"]> }) {
  const presentation = accessPresentation(level);
  const hasAccess = presentation.active;
  const unlockHref = level.access.subscriptionId
    ? `/dashboard/subscription/renew/${encodeURIComponent(level.access.subscriptionId)}`
    : `/dashboard/subscription/new?level=${encodeURIComponent(level.id)}`;

  return (
    <section className="relative overflow-hidden rounded-[1.35rem] border border-blue-200/75 bg-[linear-gradient(105deg,#f7faff_0%,#eaf2ff_100%)] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.045)] dark:border-blue-400/15 dark:bg-[linear-gradient(105deg,#0d1b2e_0%,#102b55_100%)] sm:p-7">
      <div className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(310px,0.9fr)]">
        <div className="relative z-10">
          <p className="text-xs font-extrabold text-[var(--student-blue)]">Vista previa del nivel</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black tracking-[-0.035em] text-[var(--student-text)] sm:text-3xl">{level.name}</h2>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${hasAccess ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-white/75 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"}`}>
              {hasAccess ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> : <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" />}
              {presentation.badge}
            </span>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--student-muted)]">Explora las materias, módulos y recursos publicados que incluye este nivel antes de entrar o desbloquearlo.</p>
          {level.access.status === "CANCELED_ACTIVE" && level.access.currentPeriodEnd ? (
            <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Tu cancelación conserva acceso hasta el {dateLabel(level.access.currentPeriodEnd)}.</p>
          ) : null}
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-[var(--student-text)]">
            <div className="flex items-center gap-2"><GraduationCap aria-hidden="true" className="h-4 w-4 text-[var(--student-blue)]" /><dt className="sr-only">Materias</dt><dd>{level.subjectCount} {level.subjectCount === 1 ? "materia" : "materias"}</dd></div>
            <div className="flex items-center gap-2"><LibraryBig aria-hidden="true" className="h-4 w-4 text-[var(--student-blue)]" /><dt className="sr-only">Módulos</dt><dd>{level.moduleCount} {level.moduleCount === 1 ? "módulo" : "módulos"}</dd></div>
            <div className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-[var(--student-blue)]" /><dt className="sr-only">Recursos</dt><dd>{level.resourceCount} {level.resourceCount === 1 ? "recurso" : "recursos"}</dd></div>
          </dl>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            {hasAccess ? (
              <form action={enterStudentLevelAction}>
                <input type="hidden" name="levelId" value={level.id} />
                <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--student-blue)] px-5 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(23,104,229,0.22)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:w-auto">
                  <BookOpenCheck aria-hidden="true" className="h-4 w-4" /> Entrar al nivel
                </button>
              </form>
            ) : level.access.status === "PENDING" && level.access.pendingPaymentId ? (
              <Link href={`/dashboard/subscription/payments/${encodeURIComponent(level.access.pendingPaymentId)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--student-blue)] px-5 text-sm font-extrabold text-white">Ver pago en proceso <ChevronRight aria-hidden="true" className="h-4 w-4" /></Link>
            ) : (
              <Link href={unlockHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--student-blue)] px-5 text-sm font-extrabold text-white shadow-[0_10px_25px_rgba(23,104,229,0.22)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                <LockKeyhole aria-hidden="true" className="h-4 w-4" /> {level.access.status === "EXPIRED" || level.access.subscriptionId ? "Renovar nivel" : "Desbloquear nivel"}
              </Link>
            )}
            <Link href="/dashboard/subscription" className="inline-flex min-h-11 items-center justify-center px-2 text-sm font-extrabold text-[var(--student-blue)] hover:opacity-75">Ver plan de suscripción</Link>
          </div>
        </div>
        <PreviewIllustration levelNumber={level.levelNumber} />
      </div>
    </section>
  );
}

type ExploreSelection = {
  stage: EducationStage;
  levelId: string | null;
  subjectId: string | null;
};

function selectionForLevel(
  level: StudentExploreLevelDetail | null,
  fallbackStage: EducationStage,
  subjectId?: string | null,
): ExploreSelection {
  const selectedSubject = subjectId
    ? level?.subjects.find((subject) => subject.id === subjectId) ?? null
    : null;
  return {
    stage: level?.stage ?? fallbackStage,
    levelId: level?.id ?? null,
    subjectId: selectedSubject?.id ?? level?.subjects[0]?.id ?? null,
  };
}

export function StudentExploreCatalog({ data, actionError }: { data: StudentExploreData; actionError?: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<ExploreSelection>(() =>
    selectionForLevel(data.selectedLevel, data.stage, data.selectedSubjectId),
  );
  const [hasNavigatedLocally, setHasNavigatedLocally] = useState(false);
  const selectedLevel =
    data.levelDetails.find((level) => level.id === selection.levelId) ?? null;
  const visibleLevels = data.levels.filter(
    (level) => level.stage === selection.stage,
  );
  const selectedSubject =
    selectedLevel?.subjects.find(
      (subject) => subject.id === selection.subjectId,
    ) ?? null;
  const hasAccess = Boolean(
    selectedLevel && accessPresentation(selectedLevel).active,
  );

  function updateSelection(
    nextSelection: ExploreSelection,
    options?: { scrollToModules?: boolean },
  ) {
    setSelection(nextSelection);
    setHasNavigatedLocally(true);
    window.history.pushState(
      null,
      "",
      exploreUrl(
        nextSelection.stage,
        nextSelection.levelId ?? undefined,
        nextSelection.subjectId ?? undefined,
      ),
    );
    if (options?.scrollToModules) {
      window.requestAnimationFrame(() =>
        document
          .getElementById("explore-modules")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  }

  function selectStage(stage: EducationStage) {
    const level =
      data.levelDetails.find((item) => item.stage === stage) ?? null;
    updateSelection(selectionForLevel(level, stage));
  }

  function selectLevel(levelId: string) {
    const level =
      data.levelDetails.find((item) => item.id === levelId) ?? null;
    if (!level) return;
    updateSelection(selectionForLevel(level, level.stage));
  }

  function selectSubject(subjectId: string) {
    if (!selectedLevel) return;
    updateSelection(
      selectionForLevel(selectedLevel, selectedLevel.stage, subjectId),
      { scrollToModules: true },
    );
  }

  useEffect(() => {
    function restoreSelectionFromUrl(href = window.location.href) {
      const url = new URL(href, window.location.origin);
      const params = url.searchParams;
      const requestedLevelId = params.get("level");
      const requestedStage = params.get("stage");
      const level = requestedLevelId
        ? data.levelDetails.find((item) => item.id === requestedLevelId) ?? null
        : null;
      const stage: EducationStage =
        level?.stage ??
        (requestedStage === "secondary" ? "secondary" : "primary");
      const fallbackLevel =
        level ?? data.levelDetails.find((item) => item.stage === stage) ?? null;
      setSelection(
        selectionForLevel(fallbackLevel, stage, params.get("subject")),
      );
      setHasNavigatedLocally(true);
    }

    function restoreFromHistory() {
      restoreSelectionFromUrl();
    }

    function restoreFromSearch(event: Event) {
      const detail = (event as CustomEvent<StudentExploreNavigateDetail>).detail;
      restoreSelectionFromUrl(detail.href);
      if (detail.href.includes("#explore-modules")) {
        window.requestAnimationFrame(() =>
          document
            .getElementById("explore-modules")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );
      }
    }

    window.addEventListener("popstate", restoreFromHistory);
    window.addEventListener(studentExploreNavigateEvent, restoreFromSearch);
    return () => {
      window.removeEventListener("popstate", restoreFromHistory);
      window.removeEventListener(studentExploreNavigateEvent, restoreFromSearch);
    };
  }, [data.levelDetails]);

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-[-0.045em] text-[var(--student-text)] sm:text-4xl">Explorar niveles</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--student-muted)] sm:text-base">Descubre los niveles disponibles y conoce su contenido publicado antes de suscribirte.</p>
        </div>
        <div className="hidden shrink-0 gap-3 md:flex">
          <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] px-4 text-sm font-bold text-[var(--student-text)]"><GraduationCap aria-hidden="true" className="h-5 w-5 text-[var(--student-blue)]" />{data.levels.length} {data.levels.length === 1 ? "nivel disponible" : "niveles disponibles"}</div>
          <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--student-border)] bg-[var(--student-panel)] px-4 text-sm font-bold text-[var(--student-text)]"><Crown aria-hidden="true" className="h-5 w-5 text-violet-600 dark:text-violet-300" />{data.levels.every((level) => level.requiresSubscription) ? "Contenido premium por nivel" : "Acceso por nivel"}</div>
        </div>
      </header>

      {!hasNavigatedLocally && (data.requestedLevelUnavailable || data.requestedSubjectUnavailable || actionError) ? (
        <div role="status" className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-400/15 dark:bg-amber-500/10 dark:text-amber-200">
          {actionError ? "No fue posible entrar al nivel. Revisa que tu acceso continúe vigente." : data.requestedLevelUnavailable ? "El nivel solicitado ya no está disponible. Mostramos otra opción del catálogo." : "La materia solicitada ya no está disponible. Mostramos la primera materia publicada."}
        </div>
      ) : null}

      <section aria-label="Catálogo de niveles">
        <div role="tablist" aria-label="Etapa educativa" className="flex border-b border-[var(--student-border)]">
          {(["primary", "secondary"] as const).map((stage) => {
            const active = selection.stage === stage;
            return <button key={stage} data-stage={stage} type="button" role="tab" aria-selected={active} onClick={() => selectStage(stage)} onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const nextStage: EducationStage = event.key === "ArrowLeft" || event.key === "Home" ? "primary" : "secondary";
              (event.currentTarget.parentElement?.querySelector(`[data-stage="${nextStage}"]`) as HTMLButtonElement | null)?.focus();
              selectStage(nextStage);
            }} className={`relative min-h-12 px-4 text-sm font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--student-blue)] ${active ? "text-[var(--student-blue)] after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-[var(--student-blue)]" : "text-[var(--student-muted)] hover:text-[var(--student-text)]"}`}>{stage === "primary" ? "Primaria" : "Secundaria"}</button>;
          })}
        </div>

        {visibleLevels.length ? (
          <div className="relative mt-3">
            <div ref={scrollerRef} role="group" aria-label={`Niveles de ${selection.stage === "primary" ? "Primaria" : "Secundaria"}`} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 pr-2 [scrollbar-width:thin] [overscroll-behavior-inline:contain]">
              {visibleLevels.map((level, index) => <LevelCard key={level.id} level={level} index={index} selected={selection.levelId === level.id} disabled={false} onSelect={() => selectLevel(level.id)} />)}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between xl:flex">
              <button type="button" aria-label="Ver niveles anteriores" onClick={() => scrollerRef.current?.scrollBy({ left: -300, behavior: "smooth" })} className="pointer-events-auto -ml-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--student-border)] bg-[var(--student-panel)] text-[var(--student-text)] shadow-md"><ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>
              <button type="button" aria-label="Ver más niveles" onClick={() => scrollerRef.current?.scrollBy({ left: 300, behavior: "smooth" })} className="pointer-events-auto -mr-4 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--student-border)] bg-[var(--student-panel)] text-[var(--student-text)] shadow-md"><ArrowRight aria-hidden="true" className="h-4 w-4" /></button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-[1.25rem] border border-dashed border-[var(--student-border)] bg-[var(--student-panel)] px-6 py-12 text-center"><GraduationCap aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--student-muted)]" /><h2 className="mt-3 font-bold text-[var(--student-text)]">No hay niveles disponibles en esta etapa</h2><p className="mt-1 text-sm text-[var(--student-muted)]">Cuando un nivel sea activado, aparecerá en este catálogo.</p></div>
        )}
      </section>

      {selectedLevel ? <LevelPreview level={selectedLevel} /> : null}

      {selectedLevel ? (
        <>
          <section>
            <div className="mb-3.5 flex items-center justify-between gap-4"><h2 className="text-xl font-extrabold tracking-[-0.025em] text-[var(--student-text)]">Materias incluidas</h2>{selectedLevel.subjects.length ? <span className="text-xs font-semibold text-[var(--student-muted)]">Selecciona una materia para ver sus módulos</span> : null}</div>
            {selectedLevel.subjects.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {selectedLevel.subjects.map((subject, index) => <LearnerSubjectCard key={subject.id} index={index} variant="explore" selected={subject.id === selection.subjectId} onSelect={() => selectSubject(subject.id)} subject={{ id: subject.id, name: subject.name, description: null, moduleCount: subject.moduleCount, resourceCount: subject.resourceCount, href: exploreUrl(selectedLevel.stage, selectedLevel.id, subject.id) }} />)}
              </div>
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-[var(--student-border)] bg-[var(--student-panel)] px-6 py-10 text-center"><p className="font-bold text-[var(--student-text)]">Este nivel todavía no tiene materias activas</p><p className="mt-1 text-sm text-[var(--student-muted)]">No se muestran materias archivadas o administrativas.</p></div>
            )}
          </section>
          <StudentExploreModules subject={selectedSubject} hasAccess={hasAccess} />
        </>
      ) : null}
    </div>
  );
}
