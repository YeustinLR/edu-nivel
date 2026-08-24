import { randomUUID } from "node:crypto";

import { redirect } from "next/navigation";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { CreateResourceForm } from "@/modules/content/components/admin/creation/CreateResourceForm";
import { ResourceCreationHelp } from "@/modules/content/components/admin/creation/ResourceCreationHelp";
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
  const subjectHref = `/dashboard/admin/content/subjects/${encodeURIComponent(context.subject.id)}`;
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
      <ContentFormSurface wide>
        <div className="relative -mt-3 sm:-mt-4">
          <div className="absolute right-0 top-0 z-10">
            <ResourceCreationHelp
              title="Ayuda rápida"
              note="El contenido escrito forma parte del recurso; el adjunto es opcional."
              items={[
                "Escribe un título y desarrolla el contenido educativo.",
                "Añade una duración estimada si puede orientar al estudiante.",
                "Adjunta un video, archivo, imagen o vínculo si lo necesitas.",
              ]}
            />
          </div>
          {unavailableReason ? (
            <p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
              {unavailableReason}
            </p>
          ) : (
            <CreateResourceForm
              moduleId={context.id}
              requestId={randomUUID()}
              closeHref={subjectHref}
            />
          )}
        </div>
      </ContentFormSurface>
    </div>
  );
}
