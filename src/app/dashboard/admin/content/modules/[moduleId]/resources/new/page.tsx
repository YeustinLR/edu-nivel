import { randomUUID } from "node:crypto";

import { FilePlus2 } from "lucide-react";
import { redirect } from "next/navigation";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CreateResourceForm } from "@/modules/content/components/admin/creation/CreateResourceForm";
import { getResourceCreationUnavailableReason } from "@/modules/content/domain/content-permissions";
import { getResourceCreationContext } from "@/server/content/create-catalog-resource";

export default async function CreateAdminResourcePage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const { moduleId } = await params;
  const context = await getResourceCreationContext(moduleId);
  if (!context) redirect("/dashboard/admin/content/catalog");

  const moduleHref = `/dashboard/admin/content/modules/${encodeURIComponent(context.id)}`;
  const unavailableReason = getResourceCreationUnavailableReason({
    publicationStatus: context.publicationStatus,
    moduleIsActive: context.isActive,
    subjectIsActive: context.subject.isActive,
    levelIsActive: context.subject.level.isActive,
  });

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Crear contenido"
        title="Nuevo recurso"
        description={`Añade contenido a ${context.title}.`}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: `Nivel ${context.subject.level.levelNumber}`, href: `/dashboard/admin/content/levels/${encodeURIComponent(context.subject.level.id)}` },
          { label: context.subject.name, href: `/dashboard/admin/content/subjects/${encodeURIComponent(context.subject.id)}` },
          { label: context.title, href: moduleHref },
          { label: "Nuevo recurso" },
        ]}
      />
      <ContentFormSurface
        aside={
          <div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
              <FilePlus2 aria-hidden="true" className="h-5 w-5" />
            </span>
            <h2 className="mt-4 font-semibold text-foreground">Añade un recurso</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Escribe un título y, si lo necesitas, adjunta un archivo, un video, un vínculo o contenido educativo.
            </p>
          </div>
        }
      >
        {unavailableReason ? (
          <p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            {unavailableReason}
          </p>
        ) : (
          <CreateResourceForm
            moduleId={context.id}
            requestId={randomUUID()}
            closeHref={moduleHref}
          />
        )}
      </ContentFormSurface>
    </div>
  );
}
