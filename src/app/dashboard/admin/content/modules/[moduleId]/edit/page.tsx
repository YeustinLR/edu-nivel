import { notFound } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { EditModuleForm } from "@/modules/content/components/editor/EditModuleForm";
import { requireRole } from "@/server/auth/guards";
import { getModuleEditorData } from "@/server/content/content-detail-queries";
import { prisma } from "@/server/db/prisma";

export default async function EditAdminModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const admin = await requireRole(Role.ADMIN);
  const [moduleRecord, context] = await Promise.all([
    getModuleEditorData(moduleId, admin),
    prisma.module.findUnique({
      where: { id: moduleId },
      select: { subject: { select: { id: true, name: true, level: { select: { levelNumber: true } } } } },
    }),
  ]);
  if (!moduleRecord || !context) notFound();
  const moduleHref = `/dashboard/admin/content/modules/${encodeURIComponent(moduleRecord.id)}`;

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Administrar contenido"
        title={`Editar ${moduleRecord.title}`}
        description={`Nivel ${context.subject.level.levelNumber} / ${context.subject.name}. La autoría original se conservará.`}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: context.subject.name, href: `/dashboard/admin/content/subjects/${encodeURIComponent(context.subject.id)}` },
          { label: moduleRecord.title, href: moduleHref },
          { label: "Editar" },
        ]}
      />
      <ContentFormSurface>
        <div className="space-y-7">
          {moduleRecord.canEdit ? (
            <EditModuleForm moduleRecord={{ ...moduleRecord, updatedAt: moduleRecord.updatedAt.toISOString() }} closeHref={moduleHref} />
          ) : (
            <p role="alert" className="rounded-lg bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">Este módulo no puede editarse en su estado actual.</p>
          )}
          <ContentAvailabilityControl
            type="module"
            id={moduleRecord.id}
            isActive={moduleRecord.isActive}
            updatedAt={moduleRecord.updatedAt.toISOString()}
            canChange={moduleRecord.isActive ? moduleRecord.canArchive : moduleRecord.canReactivate}
            unavailableReason="Solo puede archivarse mientras sea editable o después de despublicarlo."
          />
        </div>
      </ContentFormSurface>
    </div>
  );
}
