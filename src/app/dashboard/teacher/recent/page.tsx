import { Clock3, Compass } from "lucide-react";
import Link from "next/link";

import { Role } from "@/generated/prisma/enums";
import { LearnerResourceCard } from "@/modules/dashboard/components/learner/LearnerDashboardCards";
import { LearnerPageHeader } from "@/modules/dashboard/components/learner/LearnerPageHeader";
import { getLearnerDashboardData } from "@/server/content/learner-dashboard-queries";

export default async function TeacherRecentPage() {
  const data = await getLearnerDashboardData(Role.TEACHER);

  return (
    <div className="space-y-7">
      <LearnerPageHeader
        eyebrow="Tu actividad docente"
        title="Consultados recientemente"
        description="Recursos docentes con actividad registrada en tu nivel actual."
      />
      {data.recentResources.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.recentResources.map((resource) => <LearnerResourceCard key={resource.id} resource={resource} />)}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--student-border)] bg-[var(--student-panel)] px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]"><Clock3 aria-hidden="true" className="h-7 w-7" /></span>
          <h2 className="mt-4 text-lg font-bold text-[var(--student-text)]">Todavía no hay consultas recientes</h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-[var(--student-muted)]">Esta sección utiliza solamente actividad real registrada en recursos docentes.</p>
          {data.availableResources.length ? <Link href="/dashboard/teacher/explore" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--student-blue)] px-4 text-sm font-bold text-white"><Compass aria-hidden="true" className="h-4 w-4" />Explorar recursos</Link> : null}
        </div>
      )}
    </div>
  );
}
