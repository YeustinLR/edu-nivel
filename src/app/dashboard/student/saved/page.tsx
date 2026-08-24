import { Bookmark, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { StudentSavedResourceCard } from "@/modules/content/components/student-content/StudentSavedResourceCard";
import { LearnerPageHeader } from "@/modules/dashboard/components/learner/LearnerPageHeader";
import { getStudentDashboardData } from "@/server/content/learner-dashboard-queries";

export default async function StudentSavedPage() {
  const data = await getStudentDashboardData();
  const locked = data.access.status === "LOCKED";

  return (
    <div className="space-y-7">
      <LearnerPageHeader
        eyebrow="Tu biblioteca"
        title="Guardados"
        description="Tus recursos guardados, disponibles para retomarlos cuando quieras."
      />
      {data.savedResources.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.savedResources.map((resource) => (
            <StudentSavedResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--student-border)] bg-[var(--student-panel)] px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--student-blue-soft)] text-[var(--student-blue)]">
            {locked ? (
              <LockKeyhole aria-hidden="true" className="h-7 w-7" />
            ) : (
              <Bookmark aria-hidden="true" className="h-7 w-7" />
            )}
          </span>
          <h2 className="mt-4 text-lg font-bold text-[var(--student-text)]">
            {locked ? "Tus guardados no están disponibles" : "No hay recursos guardados"}
          </h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-[var(--student-muted)]">
            {locked
              ? "Necesitas acceso activo a tu nivel para abrir sus recursos guardados."
              : "Abre una materia y utiliza Guardar en cualquier recurso que quieras consultar después."}
          </p>
          <Link
            href={locked ? "/dashboard/subscription" : "/dashboard/student/content"}
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--student-blue)] px-4 text-sm font-bold text-white"
          >
            {locked ? "Ver suscripción" : "Explorar materias"}
          </Link>
        </div>
      )}
    </div>
  );
}
