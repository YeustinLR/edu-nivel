"use client";

import { Play } from "lucide-react";
import Link from "next/link";

import type { WeeklyDay } from "@/components/materias/types";

interface LessonHeroProps {
  eyebrow: string;
  title: string;
  completedLessons: number;
  totalLessons: number;
  resumeLabel: string;
  resumeHref: string;
  weeklyGoalLabel: string;
  weeklyDays: readonly WeeklyDay[];
  moduleProgress: number;
  moduleLabel: string;
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="relative size-[86px] shrink-0" role="img" aria-label={`${normalizedValue}% ${label}`}>
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
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <strong className="font-heading text-base text-white">{normalizedValue}%</strong>
        <span className="text-[9px] text-white/70">{label}</span>
      </div>
    </div>
  );
}

export function LessonHero({
  eyebrow,
  title,
  completedLessons,
  totalLessons,
  resumeLabel,
  resumeHref,
  weeklyGoalLabel,
  weeklyDays,
  moduleProgress,
  moduleLabel,
}: LessonHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-card bg-gradient-to-r from-ink-900 via-[#1a294d] to-[#22355f] px-5 py-6 text-white shadow-md sm:px-7">
      <div aria-hidden="true" className="absolute -right-16 -top-20 size-64 rounded-full bg-gold/12 blur-3xl" />
      <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 max-w-2xl flex-1">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/78">
            <Play aria-hidden="true" className="size-3 fill-current" />
            {eyebrow}
          </p>
          <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] sm:text-[1.7rem]">{title}</h1>
          <div className="mt-4 flex max-w-md items-center gap-3">
            <progress
              value={completedLessons}
              max={totalLessons || 1}
              aria-label={`${completedLessons} de ${totalLessons} lecciones`}
              className="h-2 flex-1 appearance-none overflow-hidden rounded-full bg-white/20 [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-gold [&::-webkit-progress-bar]:bg-white/20 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-gold"
            />
            <span className="font-meta text-xs text-white">
              {completedLessons}/{totalLessons} lecciones
            </span>
          </div>
          <Link
            href={resumeHref}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-control bg-gold px-5 font-heading text-sm font-bold text-ink-900 shadow-sm transition-colors motion-reduce:transition-none hover:bg-[#f4bf15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
          >
            <Play aria-hidden="true" className="size-4 fill-current" />
            {resumeLabel}
          </Link>
        </div>

        <div className="flex items-center gap-5 sm:gap-7">
          <div>
            <p className="mb-2 text-xs font-semibold text-white/75">{weeklyGoalLabel}</p>
            <div className="flex gap-1.5" role="list" aria-label={weeklyGoalLabel}>
              {weeklyDays.map((day) => (
                <span
                  key={day.id}
                  role="listitem"
                  aria-label={day.label}
                  className={`size-4 rounded-[5px] ${
                    day.status === "done"
                      ? "bg-mint"
                      : day.status === "today"
                        ? "bg-gold ring-2 ring-white/20"
                        : "bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>
          <ProgressRing value={moduleProgress} label={moduleLabel} />
        </div>
      </div>
    </section>
  );
}
