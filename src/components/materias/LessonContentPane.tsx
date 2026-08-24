"use client";

import { Bookmark, Check, EllipsisVertical, Lightbulb, Timer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type {
  LessonContent,
  LessonNavigationItem,
  NumberLineVisual,
} from "@/components/materias/types";

interface LessonContentPaneProps {
  lessonLabel: string;
  moduleLabel: string;
  title: string;
  durationLabel: string;
  positionLabel: string;
  saveLabel: string;
  savedLabel: string;
  moreOptionsLabel: string;
  completeLabel: string;
  completedLabel: string;
  initialSaved: boolean;
  initialCompleted: boolean;
  content: LessonContent;
  previous: LessonNavigationItem | null;
  next: LessonNavigationItem | null;
  totalSteps: number;
  currentStep: number;
}

function NumberLineCard({ visual }: { visual: NumberLineVisual }) {
  const ticks = [-8, -6, -4, -2, 0, 2, 4, 6];

  return (
    <figure className="rounded-[16px] bg-ink-900 p-5 text-white" aria-label={visual.accessibleLabel}>
      <figcaption className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/65">{visual.eyebrow}</figcaption>
      <p className="mt-3 text-center font-meta text-xl font-semibold">{visual.equation}</p>
      <svg role="img" aria-label={visual.accessibleLabel} viewBox="0 0 360 92" className="mt-1 h-auto w-full">
        <defs>
          <marker id="coral-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#F2603D" />
          </marker>
          <marker id="gold-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#EAB308" />
          </marker>
        </defs>
        <line x1="25" y1="64" x2="337" y2="64" stroke="#6B7590" strokeWidth="2" />
        {ticks.map((tick, index) => {
          const x = 25 + index * (312 / (ticks.length - 1));
          return (
            <g key={tick}>
              <line x1={x} y1="58" x2={x} y2="70" stroke="#CBD5E1" strokeWidth="1.5" />
              <text x={x} y="84" textAnchor="middle" fill="#CBD5E1" fontSize="9">{tick}</text>
            </g>
          );
        })}
        <circle cx="159" cy="64" r="4.5" fill="#EAB308" />
        <path d="M 203 60 Q 181 22 114 57" fill="none" stroke="#F2603D" strokeWidth="2.5" markerEnd="url(#coral-arrow)" />
        <text x="157" y="29" textAnchor="middle" fill="#F2603D" fontSize="10">{visual.firstJumpLabel}</text>
        <path d="M 203 60 Q 225 22 247 57" fill="none" stroke="#EAB308" strokeWidth="2.5" markerEnd="url(#gold-arrow)" />
        <text x="230" y="29" textAnchor="middle" fill="#EAB308" fontSize="10">{visual.secondJumpLabel}</text>
      </svg>
    </figure>
  );
}

export function LessonContentPane({
  lessonLabel,
  moduleLabel,
  title,
  durationLabel,
  positionLabel,
  saveLabel,
  savedLabel,
  moreOptionsLabel,
  completeLabel,
  completedLabel,
  initialSaved,
  initialCompleted,
  content,
  previous,
  next,
  totalSteps,
  currentStep,
}: LessonContentPaneProps) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [isCompleted, setIsCompleted] = useState(initialCompleted);

  return (
    <article className="overflow-hidden rounded-card border border-line bg-surface shadow-sm dark:border-[var(--student-border)] dark:bg-[var(--student-panel)]">
      <header className="flex flex-col gap-5 border-b border-line px-5 py-5 dark:border-[var(--student-border)] sm:px-7 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500 dark:text-[var(--student-muted)]">
            <span className="rounded-md bg-gold-100 px-2 py-1 font-meta text-[10px] font-semibold uppercase text-[#8a6200] dark:bg-gold/15 dark:text-gold">{lessonLabel}</span>
            <span>{moduleLabel}</span>
          </div>
          <h2 className="mt-2 font-heading text-2xl font-bold tracking-[-0.025em] text-ink-900 dark:text-[var(--student-text)]">{title}</h2>
          <p className="mt-2 flex items-center gap-2 font-meta text-[11px] text-ink-500 dark:text-[var(--student-muted)]">
            <Timer aria-hidden="true" className="size-3.5" />
            <span>{durationLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{positionLabel}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label={isSaved ? savedLabel : saveLabel}
            aria-pressed={isSaved}
            onClick={() => setIsSaved((value) => !value)}
            className={`flex size-10 items-center justify-center rounded-control border border-line transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 dark:border-[var(--student-border)] ${isSaved ? "bg-gold-100 text-[#9a6500] dark:bg-gold/15 dark:text-gold" : "bg-surface text-coral hover:bg-[#fff4ef] dark:bg-[var(--student-panel)] dark:hover:bg-coral/10"}`}
          >
            <Bookmark aria-hidden="true" className="size-[17px]" fill={isSaved ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            aria-label={moreOptionsLabel}
            className="flex size-10 items-center justify-center rounded-control border border-line bg-surface text-ink-700 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 dark:border-[var(--student-border)] dark:bg-[var(--student-panel)] dark:text-[var(--student-text)] dark:hover:bg-[var(--student-soft)]"
          >
            <EllipsisVertical aria-hidden="true" className="size-[17px]" />
          </button>
          <button
            type="button"
            aria-pressed={isCompleted}
            onClick={() => setIsCompleted((value) => !value)}
            className={`inline-flex min-h-10 items-center gap-2 rounded-control px-4 text-sm font-bold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 ${isCompleted ? "bg-mint text-white" : "bg-mint-100 text-mint hover:bg-[#c7efda] dark:bg-mint/15 dark:hover:bg-mint/20"}`}
          >
            <Check aria-hidden="true" className="size-4" strokeWidth={3} />
            {isCompleted ? completedLabel : completeLabel}
          </button>
        </div>
      </header>

      <div className="space-y-5 px-5 py-6 text-[15px] leading-6 text-ink-700 dark:text-[var(--student-muted)] sm:px-7">
        <section aria-labelledby="lesson-section-title">
          <h3 id="lesson-section-title" className="font-heading text-base font-bold text-ink-900 dark:text-[var(--student-text)]">{content.sectionTitle}</h3>
          <p className="mt-1">{content.introduction}</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {content.rules.map((rule) => (
              <li key={rule.id}>
                <strong className="text-ink-900 dark:text-[var(--student-text)]">{rule.emphasis}</strong> {rule.text}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="examples-title">
          <h3 id="examples-title" className="font-heading text-base font-bold text-ink-900 dark:text-[var(--student-text)]">{content.examplesTitle}</h3>
          <div className="mt-2 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.95fr)]">
            <div className="space-y-2">
              {content.examples.map((example) => (
                <div key={example.id} className="flex flex-col gap-1 rounded-control border border-line bg-[#f3efe4] px-4 py-2 dark:border-[var(--student-border)] dark:bg-[var(--student-bg)] sm:flex-row sm:items-center sm:justify-between">
                  <code className="font-meta text-sm font-semibold text-ink-900 dark:text-[var(--student-text)]">{example.expression}</code>
                  <span className="text-[10px] text-ink-500 dark:text-[var(--student-muted)]">{example.hint}</span>
                </div>
              ))}
            </div>
            <NumberLineCard visual={content.visual} />
          </div>
        </section>

        <aside className="flex gap-3 rounded-[16px] border border-violet/20 bg-violet-100 p-4 text-[#563ab8] dark:bg-violet/15 dark:text-[var(--student-blue)]">
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-control bg-violet text-white">
            <Lightbulb className="size-5" fill="currentColor" />
          </span>
          <div>
            <h3 className="font-heading text-sm font-bold text-ink-900 dark:text-[var(--student-text)]">{content.calloutTitle}</h3>
            <ul className="mt-1 list-disc pl-5 text-sm leading-5">
              {content.calloutItems.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </aside>
      </div>

      <footer className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-line px-5 py-4 dark:border-[var(--student-border)] sm:px-7">
        <div>
          {previous ? (
            <Link href={previous.href} className="inline-flex min-h-10 items-center rounded-control border border-line px-3 text-sm font-semibold text-ink-700 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 dark:border-[var(--student-border)] dark:text-[var(--student-text)] dark:hover:bg-[var(--student-soft)]">
              ← {previous.label}
            </Link>
          ) : null}
        </div>
        <div className="flex gap-1.5" aria-label={`${currentStep} de ${totalSteps}`}>
          {Array.from({ length: totalSteps }, (_, index) => (
            <span key={index} aria-hidden="true" className={`h-1.5 rounded-full ${index + 1 <= currentStep ? "w-5 bg-gold" : "w-1.5 bg-line"}`} />
          ))}
        </div>
        <div className="text-right">
          {next ? (
            <Link href={next.href} className="inline-flex min-h-10 items-center rounded-control bg-ink-900 px-4 text-sm font-bold text-white hover:bg-[#1f2b46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2">
              {next.label} →
            </Link>
          ) : null}
        </div>
      </footer>
    </article>
  );
}
