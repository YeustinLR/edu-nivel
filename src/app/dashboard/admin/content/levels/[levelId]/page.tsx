import { BookOpen, CreditCard, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  adminCatalogBreadcrumbs,
  ContentPageHeader,
  primaryActionClass,
  secondaryActionClass,
} from "@/modules/content/components/admin/ContentPageHeader";
import { getAdminContentCatalog } from "@/server/content/admin-content-queries";
import { getLevelEditorData } from "@/server/content/content-detail-queries";

export default async function AdminLevelDetailPage({
  params,
}: {
  params: Promise<{ levelId: string }>;
}) {
  const { levelId } = await params;
  const [levels, levelEditor] = await Promise.all([
    getAdminContentCatalog(""),
    getLevelEditorData(levelId),
  ]);
  const level = levels.find((item) => item.id === levelId);
  if (!level || !levelEditor) notFound();

  const levelHref = `/dashboard/admin/content/levels/${encodeURIComponent(level.id)}`;
  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Nivel académico"
        title={`Nivel ${level.levelNumber}`}
        description={level.description ?? "Este nivel todavía no tiene una descripción."}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: `Nivel ${level.levelNumber}` },
        ]}
        metadata={
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${level.isActive ? "bg-success/10 text-success" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>
              {level.isActive ? "Activo" : "Archivado"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground-secondary">
              <CreditCard aria-hidden="true" className="h-3.5 w-3.5" />
              {levelEditor.requiresSubscription ? "Requiere suscripción" : "Acceso gratuito"}
            </span>
          </div>
        }
        actions={
          <>
            <Link href={`${levelHref}/edit`} className={secondaryActionClass}>
              <Pencil aria-hidden="true" className="h-4 w-4" />
              Editar nivel
            </Link>
            {level.isActive ? (
              <Link href={`/dashboard/admin/content/subjects/new?levelId=${encodeURIComponent(level.id)}`} className={primaryActionClass}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Crear materia
              </Link>
            ) : null}
          </>
        }
      />

      <section aria-labelledby="level-subjects-heading" className="space-y-4">
        <div>
          <h2 id="level-subjects-heading" className="text-xl font-semibold text-foreground">Materias</h2>
          <p className="mt-1 text-sm text-muted">Selecciona una materia para gestionar sus módulos.</p>
        </div>
        {level.subjects.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {level.subjects.map((subject) => (
              <li key={subject.id}>
                <Link
                  href={`/dashboard/admin/content/subjects/${encodeURIComponent(subject.id)}`}
                  className="group flex h-full min-h-28 flex-col rounded-xl border border-border bg-card p-4 hover:border-secondary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <BookOpen aria-hidden="true" className="h-5 w-5 text-secondary" />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${subject.isActive ? "bg-success/10 text-success" : "bg-red-500/10 text-red-700 dark:text-red-300"}`}>
                      {subject.isActive ? "Activa" : "Archivada"}
                    </span>
                  </div>
                  <h3 className="mt-3 font-semibold text-foreground group-hover:text-secondary">{subject.name}</h3>
                  <p className="mt-auto pt-3 text-xs text-muted">{subject.moduleCount} {subject.moduleCount === 1 ? "módulo" : "módulos"}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center">
            <BookOpen aria-hidden="true" className="mx-auto h-9 w-9 text-muted" />
            <h3 className="mt-4 font-semibold text-foreground">Este nivel no tiene materias</h3>
            <p className="mt-1 text-sm text-muted">Crea una materia para continuar construyendo la jerarquía.</p>
          </div>
        )}
      </section>
    </div>
  );
}
