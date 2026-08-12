import Link from "next/link";
import {
  ArrowRight,
  BookMarked,
  Compass,
  Presentation,
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

function TeacherFocusCard({ data }: { data: LearnerDashboardData }) {
  const target = data.continueTarget;
  const locked = data.access.status === "LOCKED";
  const noLevel = data.access.status === "NO_LEVEL";
  const href = locked
    ? "/dashboard/subscription"
    : noLevel
      ? "/dashboard/teacher/content"
      : target?.href ?? "/dashboard/teacher/explore";
  const eyebrow = target?.isProgressRecord
    ? "Continúa consultando"
    : "Biblioteca docente";
  const title = locked
    ? "Activa el acceso a tu nivel"
    : noLevel
      ? "Elige el nivel que deseas preparar"
      : target?.subjectName ?? "Prepara tu próxima clase";
  const context = target
    ? `${target.moduleTitle} · ${target.title}`
    : locked
      ? "Conoce las opciones de suscripción para docentes"
      : noLevel
        ? "Los materiales docentes aparecerán cuando selecciones un nivel"
        : "Consulta materias y recursos publicados para docentes";

  return (
    <section className="relative min-h-[204px] overflow-hidden rounded-[1.35rem] border border-indigo-200/75 bg-[linear-gradient(105deg,#f7f9ff_0%,#edf1ff_100%)] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.045)] dark:border-indigo-400/15 dark:bg-[linear-gradient(105deg,#0d1b2e_0%,#172554_100%)] sm:p-7">
      <div className="relative z-10 flex h-full max-w-[60%] flex-col items-start max-lg:max-w-[70%] max-sm:max-w-full">
        <p className="text-sm font-bold text-[var(--student-blue)]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-[var(--student-text)] sm:text-[1.9rem]">{title}</h2>
        <p className="mt-2 line-clamp-1 text-sm font-medium text-[var(--student-muted)] sm:text-base">{context}</p>
      </div>
      <div aria-hidden="true" className="absolute -bottom-10 right-[18%] hidden h-44 w-40 rotate-[-5deg] rounded-[1.4rem] bg-gradient-to-br from-indigo-500 to-blue-800 p-5 text-white shadow-[0_25px_40px_rgba(37,99,235,0.25)] sm:block">
        <Sparkles className="h-6 w-6 opacity-80" />
        <Presentation className="mt-5 h-16 w-16 opacity-85" />
        <div className="mt-4 h-2 w-24 rounded bg-white/60" />
      </div>
      <Link href={href} className="absolute bottom-6 right-6 z-20 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[var(--student-blue)] px-5 text-sm font-bold text-white shadow-[0_10px_25px_rgba(23,104,229,0.22)] transition hover:-translate-y-0.5 max-sm:static max-sm:mt-6">
        {locked ? "Ver suscripción" : noLevel ? "Elegir nivel" : target?.isProgressRecord ? "Continuar consulta" : "Explorar recursos"}
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </section>
  );
}

export function TeacherDashboardHome({ data }: { data: LearnerDashboardData }) {
  return (
    <div className="space-y-7 lg:space-y-8">
      <div className="grid gap-4 xl:grid-cols-[minmax(285px,0.34fr)_minmax(0,1fr)]">
        <LearnerLevelCard data={data} />
        <TeacherFocusCard data={data} />
      </div>

      <section>
        <LearnerSectionHeading title="Materias para enseñar" href="/dashboard/teacher/content" label="Ver todas" />
        {data.subjects.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.subjects.map((subject, index) => <LearnerSubjectCard key={subject.id} subject={subject} index={index} />)}
          </div>
        ) : (
          <LearnerEmptyPanel icon={Presentation} title="Aún no hay materias docentes disponibles" description={data.access.status === "LOCKED" ? "El nivel seleccionado requiere una suscripción docente activa." : data.access.status === "NO_LEVEL" ? "Selecciona un nivel para consultar sus materiales docentes." : "Cuando se publiquen módulos para docentes, aparecerán aquí."} action={data.access.status === "LOCKED" ? { href: "/dashboard/subscription", label: "Ver suscripción" } : undefined} />
        )}
      </section>

      <section>
        <LearnerSectionHeading title="Recursos para tus clases" href="/dashboard/teacher/explore" />
        {data.availableResources.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.availableResources.slice(0, 3).map((resource) => <LearnerResourceCard key={resource.id} resource={resource} />)}
          </div>
        ) : (
          <LearnerEmptyPanel icon={BookMarked} title="No hay recursos docentes publicados" description="Aquí aparecerán únicamente recursos reales pertenecientes a módulos TEACHER o BOTH." />
        )}
      </section>

      <section>
        <LearnerSectionHeading title="Consultados recientemente" href="/dashboard/teacher/recent" />
        {data.recentResources.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.recentResources.slice(0, 3).map((resource) => <LearnerResourceCard key={resource.id} resource={resource} />)}
          </div>
        ) : (
          <LearnerEmptyPanel icon={Compass} title="Todavía no hay consultas recientes" description="Los recursos con actividad registrada aparecerán aquí, sin crear historial ficticio." action={data.availableResources.length ? { href: "/dashboard/teacher/explore", label: "Explorar recursos" } : undefined} />
        )}
      </section>
    </div>
  );
}
