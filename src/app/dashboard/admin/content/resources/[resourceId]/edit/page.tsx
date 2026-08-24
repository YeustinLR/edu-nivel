import { notFound } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { ResourceCreationHelp } from "@/modules/content/components/admin/creation/ResourceCreationHelp";
import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { EditResourceForm } from "@/modules/content/components/editor/EditResourceForm";
import { requireRole } from "@/server/auth/guards";
import { getResourceContentDetail } from "@/server/content/content-detail-queries";
import { prisma } from "@/server/db/prisma";

export default async function EditAdminResourcePage({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  const admin = await requireRole(Role.ADMIN);
  const [resource, context] = await Promise.all([
    getResourceContentDetail({ resourceId, actor: admin }),
    prisma.resource.findUnique({ where: { id: resourceId }, select: { module: { select: { id: true, title: true } } } }),
  ]);
  if (!resource || !context) notFound();
  const resourceHref = `/dashboard/admin/content/resources/${encodeURIComponent(resource.id)}`;

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Administrar contenido"
        title={`Editar ${resource.title}`}
        description={`Recurso del módulo ${context.module.title}. La autoría original se conservará.`}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: context.module.title, href: `/dashboard/admin/content/modules/${encodeURIComponent(context.module.id)}` },
          { label: resource.title, href: resourceHref },
          { label: "Editar" },
        ]}
      />
      <ContentFormSurface wide>
        <div className="relative -mt-3 sm:-mt-4">
          <div className="absolute right-0 top-0 z-10">
            <ResourceCreationHelp
              title="Ayuda rápida"
              note="El contenido escrito forma parte del recurso; el adjunto se conserva durante la edición."
              items={[
                "Revisa el título y el contenido educativo.",
                "Actualiza la duración estimada si puede orientar al estudiante.",
                "Comprueba los datos del adjunto actual si el recurso tiene uno.",
              ]}
            />
          </div>
          <div className="space-y-7">
            {resource.canEdit ? (
              <EditResourceForm resource={{ ...resource, updatedAt: resource.updatedAt.toISOString() }} closeHref={resourceHref} />
            ) : (
              <p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">Este recurso no puede editarse en su estado actual.</p>
            )}
            <ContentAvailabilityControl
              type="resource"
              id={resource.id}
              isActive={resource.isActive}
              updatedAt={resource.updatedAt.toISOString()}
              canChange={resource.isActive ? resource.canArchive : resource.canReactivate}
              unavailableReason="Retira el recurso de revisión o despublícalo antes de archivarlo."
            />
          </div>
        </div>
      </ContentFormSurface>
    </div>
  );
}
