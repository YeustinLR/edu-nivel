import { notFound } from "next/navigation";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { EditSubjectForm } from "@/modules/content/components/editor/EditSubjectForm";
import { getSubjectEditorData } from "@/server/content/content-detail-queries";

export default async function EditAdminSubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const subject = await getSubjectEditorData(subjectId);
  if (!subject) notFound();
  const subjectHref = `/dashboard/admin/content/subjects/${encodeURIComponent(subject.id)}`;

  return (
    <div className="space-y-6">
      <ContentPageHeader
        eyebrow="Administrar contenido"
        title={`Editar ${subject.name}`}
        description={`Materia correspondiente al Nivel ${subject.levelNumber}.`}
        breadcrumbs={[
          ...adminCatalogBreadcrumbs,
          { label: subject.name, href: subjectHref },
          { label: "Editar" },
        ]}
      />
      <ContentFormSurface>
        <div className="space-y-7">
          <EditSubjectForm subject={{ ...subject, updatedAt: subject.updatedAt.toISOString() }} closeHref={subjectHref} />
          <ContentAvailabilityControl
            type="subject"
            id={subject.id}
            isActive={subject.isActive}
            updatedAt={subject.updatedAt.toISOString()}
            canChange={subject.isActive || subject.levelIsActive}
            unavailableReason="Activa primero el nivel de esta materia."
          />
        </div>
      </ContentFormSurface>
    </div>
  );
}
