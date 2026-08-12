import Link from "next/link";
import {
  ArrowRight,
  Beaker,
  Bookmark,
  Compass,
  Sparkles,
} from "lucide-react";

import {
  LearnerEmptyPanel,
  LearnerResourceCard,
  LearnerSectionHeading,
  LearnerSubjectCard,
} from "@/modules/dashboard/components/learner/LearnerDashboardCards";
import { LearnerLevelCard } from "@/modules/dashboard/components/learner/LearnerLevelCard";
import type { LearnerDashboardData } from "@/modules/dashboard/types/learner-dashboard";

function ContinueCard({ data }: { data: LearnerDashboardData }) {
  const target = data.continueTarget;
  const locked = data.access.status === "LOCKED";
  const noLevel = data.access.status === "NO_LEVEL";
  const href = locked
    ? "/dashboard/subscription"
    : noLevel
      ? "/dashboard/student/content"
      : target?.href ?? "/dashboard/student/explore";
  const eyebrow = target?.isProgressRecord ? "Continúa aprendiendo" : "Tu ruta de aprendizaje";
  const title = locked
    ? "Activa el acceso a tu nivel"
    : noLevel
      ? "Elige el nivel que quieres explorar"
      : target?.subjectName ?? "Explora tus materias";
  const context = target
    ? `${target.moduleTitle} · ${target.title}`
    : locked
      ? "Conoce las opciones de suscripción disponibles"
      : noLevel
        ? "Tu contenido aparecerá aquí al elegirlo"
        : "Descubre los recursos publicados para ti";

  return (
    <section className="relative min-h-[204px] overflow-hidden rounded-[1.35rem] border border-blue-200/75 bg-[linear-gradient(105deg,#f6f9ff_0%,#eaf2ff_100%)] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.045)] dark:border-blue-400/15 dark:bg-[linear-gradient(105deg,#0d1b2e_0%,#102b55_100%)] sm:p-7">
      <div className="relative z-10 flex h-full max-w-[58%] flex-col items-start max-lg:max-w-[68%] max-sm:max-w-full">
        <p className="text-sm font-bold text-[var(--student-blue)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-[var(--student-text)] sm:text-[1.9rem]">{title}</h2>
        <p className="mt-2 line-clamp-1 text-sm font-medium text-[var(--student-muted)] sm:text-base">{context}</p>
        {target?.progressPercent !== null && target?.progressPercent !== undefined ? (
          <div className="mt-5 flex w-full max-w-sm items-center gap-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-blue-200/70 dark:bg-blue-950/70">
              <div className="h-full rounded-full bg-[var(--student-blue)]" style={{ width: `${target.progressPercent}%` }} />
            </div>
            <span className="whitespace-nowrap text-xs font-semibold text-[var(--student-muted)]">{target.progressPercent}% completado</span>
          </div>
        ) : null}
      </div>
      <div aria-hidden="true" className="absolute bottom-[-54px] right-[18%] hidden h-48 w-36 rotate-[-8deg] rounded-[1.4rem] bg-gradient-to-br from-blue-500 to-blue-800 p-5 text-white shadow-[0_25px_40px_rgba(37,99,235,0.28)] sm:block">
        <Sparkles className="h-7 w-7 opacity-80" />
        <div className="mt-6 h-2 w-16 rounded bg-white/70" />
        <div className="mt-3 h-2 w-11 rounded bg-white/45" />
        <Beaker className="mt-5 h-12 w-12 opacity-75" />
      </div>
      <Link href={href} className="absolute bottom-6 right-6 z-20 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[var(--student-blue)] px-5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(23,104,229,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(23,104,229,0.28)] max-sm:static max-sm:mt-6">
        {locked ? "Ver suscripción" : noLevel ? "Elegir nivel" : target?.isProgressRecord ? "Continuar" : "Explorar"}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}

export function StudentDashboardHome({ data }: { data: LearnerDashboardData }) {
  return (
    <div className="space-y-7 lg:space-y-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(285px,0.34fr)_minmax(0,1fr)]">
        <LearnerLevelCard data={data} />
        <ContinueCard data={data} />
      </div>

      <section>
        <LearnerSectionHeading title="Mis materias" href="/dashboard/student/content" label="Ver todas" />
        {data.subjects.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.subjects.map((subject, index) => <LearnerSubjectCard key={subject.id} subject={subject} index={index} />)}
          </div>
        ) : (
          <LearnerEmptyPanel icon={Compass} title="Aún no hay materias disponibles" description={data.access.status === "LOCKED" ? "Tu nivel requiere acceso por suscripción." : data.access.status === "NO_LEVEL" ? "Selecciona un nivel para cargar las materias publicadas." : "Cuando se publiquen materias para tu nivel, aparecerán aquí."} action={data.access.status === "LOCKED" ? { href: "/dashboard/subscription", label: "Ver suscripción" } : undefined} />
        )}
      </section>

      <section>
        <LearnerSectionHeading title="Vistos recientemente" href="/dashboard/student/recent" />
        {data.recentResources.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.recentResources.slice(0, 3).map((resource) => <LearnerResourceCard key={resource.id} resource={resource} />)}
          </div>
        ) : (
          <LearnerEmptyPanel icon={Compass} title="Todavía no hay actividad reciente" description="Los recursos que tengan progreso registrado aparecerán aquí." action={data.subjects.length ? { href: "/dashboard/student/explore", label: "Explorar recursos" } : undefined} />
        )}
      </section>

      <section>
        <LearnerSectionHeading title="Guardados" href="/dashboard/student/saved" label="Ver todos" />
        <LearnerEmptyPanel icon={Bookmark} title="No hay recursos guardados" description="EduNivel todavía no dispone de favoritos persistentes. Esta sección queda preparada para conectarlos cuando exista esa funcionalidad." />
      </section>
    </div>
  );
}
