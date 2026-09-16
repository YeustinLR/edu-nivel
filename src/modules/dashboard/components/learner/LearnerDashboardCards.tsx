import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpenText,
  ChevronRight,
  FlaskConical,
  Globe2,
  LibraryBig,
  Microscope,
  Pi,
  Ruler,
} from "lucide-react";

import { ResourceThumbnail } from "@/modules/dashboard/components/learner/ResourceThumbnail";
import { formatResourceDuration } from "@/modules/dashboard/domain/learner-presentation";
import type {
  LearnerResourceSummary,
  LearnerSubjectSummary,
} from "@/modules/dashboard/types/learner-dashboard";

type SubjectVisual = {
  Icon: LucideIcon;
  Decoration: LucideIcon;
  className: string;
  iconClassName: string;
  decorationClassName: string;
};

const subjectVisuals: SubjectVisual[] = [
  { Icon: Pi, Decoration: Ruler, className: "border-blue-200/70 bg-[#eef5ff] dark:border-blue-400/15 dark:bg-blue-500/10", iconClassName: "bg-blue-600 text-white shadow-blue-500/20", decorationClassName: "text-blue-400/20" },
  { Icon: BookOpenText, Decoration: LibraryBig, className: "border-violet-200/70 bg-[#f6f0ff] dark:border-violet-400/15 dark:bg-violet-500/10", iconClassName: "bg-violet-600 text-white shadow-violet-500/20", decorationClassName: "text-violet-400/20" },
  { Icon: FlaskConical, Decoration: Microscope, className: "border-emerald-200/70 bg-[#f0f9ed] dark:border-emerald-400/15 dark:bg-emerald-500/10", iconClassName: "bg-emerald-600 text-white shadow-emerald-500/20", decorationClassName: "text-emerald-500/20" },
  { Icon: Globe2, Decoration: Globe2, className: "border-amber-200/70 bg-[#fff8e9] dark:border-amber-400/15 dark:bg-amber-500/10", iconClassName: "bg-amber-500 text-white shadow-amber-500/20", decorationClassName: "text-amber-500/20" },
];

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function visualForSubject(subject: LearnerSubjectSummary, index: number) {
  const name = normalize(subject.name);
  if (name.includes("matemat")) return subjectVisuals[0];
  if (name.includes("espan") || name.includes("lengua")) return subjectVisuals[1];
  if (name.includes("cienc") || name.includes("biolog") || name.includes("quim")) return subjectVisuals[2];
  if (name.includes("social") || name.includes("histor") || name.includes("geograf")) return subjectVisuals[3];
  return subjectVisuals[index % subjectVisuals.length];
}

export function LearnerSectionHeading({
  title,
  href,
  label = "Ver todo",
}: {
  title: string;
  href: string;
  label?: string;
}) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-4">
      <h2 className="text-xl font-bold tracking-[-0.025em] text-[var(--student-text)]">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-[var(--student-blue)] transition hover:opacity-75">
        {label}<ChevronRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function LearnerSubjectCard({
  subject,
  index,
  variant = "dashboard",
  selected = false,
  onSelect,
}: {
  subject: LearnerSubjectSummary;
  index: number;
  variant?: "dashboard" | "explore";
  selected?: boolean;
  onSelect?: () => void;
}) {
  const visual = visualForSubject(subject, index);
  const Icon = visual.Icon;
  const Decoration = visual.Decoration;

  const className = `group relative overflow-hidden rounded-[1.35rem] border p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(15,23,42,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--student-blue)] ${variant === "explore" ? "min-h-[132px]" : "min-h-[166px]"} ${selected ? "ring-2 ring-[var(--student-blue)] ring-offset-2 ring-offset-[var(--student-bg)]" : ""} ${visual.className}`;
  const content = (
    <>
      <div className="relative z-10 flex items-start gap-4">
        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-lg ${visual.iconClassName}`}>
          <Icon aria-hidden="true" className="h-8 w-8" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 pt-1.5">
          <h3 className="truncate text-base font-bold text-[var(--student-text)]">{subject.name}</h3>
          <p className="mt-1 text-sm text-[var(--student-muted)]">
            {subject.moduleCount} {subject.moduleCount === 1 ? "módulo" : "módulos"}
            {variant === "explore" ? ` · ${subject.resourceCount} ${subject.resourceCount === 1 ? "recurso" : "recursos"}` : ""}
          </p>
        </div>
      </div>
      <Decoration aria-hidden="true" className={`absolute -bottom-6 right-5 h-24 w-24 transition-transform duration-200 group-hover:-translate-y-1 group-hover:rotate-[-3deg] ${visual.decorationClassName}`} strokeWidth={1.2} />
      <span className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/75 bg-white/85 text-slate-700 shadow-sm transition group-hover:bg-white group-hover:text-blue-600 dark:border-white/10 dark:bg-slate-950/55 dark:text-slate-100">
        <ChevronRight aria-hidden="true" className="h-5 w-5" />
      </span>
    </>
  );

  if (variant === "explore" && onSelect) {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={subject.href} aria-current={selected ? "true" : undefined} className={className}>
      {content}
    </Link>
  );
}

export function LearnerResourceCard({
  resource,
}: {
  resource: LearnerResourceSummary;
}) {
  const duration = formatResourceDuration(
    resource.estimatedMinutes,
    resource.durationSeconds,
  );

  return (
    <Link
      href={resource.href}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-[var(--student-border)] bg-[var(--student-panel)] shadow-[0_5px_22px_rgba(15,23,42,0.035)] outline-none transition duration-200 hover:-translate-y-0.5 hover:border-blue-300/70 hover:shadow-[0_14px_36px_rgba(15,23,42,0.1)] focus-visible:border-[var(--student-blue)] focus-visible:ring-4 focus-visible:ring-blue-500/10 motion-reduce:transform-none motion-reduce:transition-none"
    >
      <ResourceThumbnail
        type={resource.type}
        title={resource.title}
        youtubeVideoId={resource.youtubeVideoId}
        duration={duration}
      />
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-extrabold leading-6 text-[var(--student-text)] transition-colors group-hover:text-[var(--student-blue)] motion-reduce:transition-none">
          {resource.title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs font-medium text-[var(--student-muted)]">
          {resource.moduleTitle}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4 text-xs text-[var(--student-muted)]">
          <span className="line-clamp-1 font-semibold">{resource.subjectName}</span>
          {duration ? (
            <span className="shrink-0 font-medium tabular-nums">{duration}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function LearnerEmptyPanel({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex min-h-32 items-center gap-4 rounded-[1.25rem] border border-dashed border-[var(--student-border)] bg-[color-mix(in_srgb,var(--student-panel)_70%,transparent)] p-5">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]"><Icon aria-hidden="true" className="h-6 w-6" /></span>
      <div className="min-w-0">
        <h3 className="font-bold text-[var(--student-text)]">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-[var(--student-muted)]">{description}</p>
        {action ? <Link href={action.href} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-[var(--student-blue)]">{action.label}<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link> : null}
      </div>
    </div>
  );
}
