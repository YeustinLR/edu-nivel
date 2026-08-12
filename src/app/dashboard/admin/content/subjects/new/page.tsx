import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CreateSubjectForm } from "@/modules/content/components/admin/creation/CreateSubjectForm";
import { getLevelCreationContext } from "@/server/content/create-catalog-content";

export default async function CreateAdminSubjectPage({
  searchParams,
}: {
  searchParams: Promise<{ levelId?: string | string[] }>;
}) {
  const params = await searchParams;
  const levelId = typeof params.levelId === "string" ? params.levelId : undefined;
  if (!levelId) redirect("/dashboard/admin/content/catalog");

  const level = await getLevelCreationContext(levelId);
  if (!level) redirect("/dashboard/admin/content/catalog");
  const levelHref = `/dashboard/admin/content/levels/${encodeURIComponent(level.id)}`;

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Crear contenido"
        title="Nueva materia"
        description={`La materia se añadirá al Nivel ${level.levelNumber}.`}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: `Nivel ${level.levelNumber}`, href: levelHref },
          { label: "Nueva materia" },
        ]}
      />
      <ContentFormSurface
        aside={
          <div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <BookOpen aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-foreground">Nivel {level.levelNumber}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              La materia debe tener un nombre único dentro de este nivel.
            </p>
            {!level.isActive ? (
              <p role="alert" className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                Reactiva el nivel antes de crear materias.
              </p>
            ) : null}
          </div>
        }
      >
        {level.isActive ? (
          <CreateSubjectForm levelId={level.id} closeHref={levelHref} />
        ) : (
          <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted">
            Este formulario no está disponible mientras el nivel permanezca archivado.
          </p>
        )}
      </ContentFormSurface>
    </div>
  );
}
