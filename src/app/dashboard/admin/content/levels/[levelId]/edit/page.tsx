import { notFound } from "next/navigation";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { EditLevelForm } from "@/modules/content/components/editor/EditLevelForm";
import { getLevelEditorData } from "@/server/content/content-detail-queries";

export default async function EditAdminLevelPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  const level = await getLevelEditorData(levelId);
  if (!level) notFound();
  const levelHref = `/dashboard/admin/content/levels/${encodeURIComponent(level.id)}`;

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Administrar contenido"
        title={`Editar Nivel ${level.levelNumber}`}
        description="Actualiza la información y disponibilidad del nivel."
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: `Nivel ${level.levelNumber}`, href: levelHref },
          { label: "Editar" },
        ]}
      />
      <ContentFormSurface>
        <div className="space-y-7">
          <EditLevelForm level={{ ...level, updatedAt: level.updatedAt.toISOString() }} closeHref={levelHref} />
          <ContentAvailabilityControl type="level" id={level.id} isActive={level.isActive} updatedAt={level.updatedAt.toISOString()} canChange />
        </div>
      </ContentFormSurface>
    </div>
  );
}
