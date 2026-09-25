import { notFound } from "next/navigation";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { AdminSubjectDeletionControl } from "@/modules/content/components/admin/detail/AdminSubjectDeletionControl";
import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { EditSubjectForm } from "@/modules/content/components/editor/EditSubjectForm";
import { getSubjectEditorData } from "@/server/content/content-detail-queries";
import { getSubjectDeletionEligibility } from "@/server/content/delete-catalog-subject";

export default async function EditAdminSubjectPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const [subject, deletionEligibility] = await Promise.all([
    getSubjectEditorData(subjectId),
    getSubjectDeletionEligibility(subjectId),
  ]);
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
      <section
        className="rounded-2xl border border-red-500/20 bg-red-500/[0.025] p-5 sm:p-6"
        aria-labelledby="subject-danger-zone-heading"
      >
        <div className="mb-5 border-b border-red-500/15 pb-4">
          <h2
            id="subject-danger-zone-heading"
            className="font-semibold text-red-700 dark:text-red-300"
          >
            Zona de peligro
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Esta acción elimina también todos los módulos y recursos de la materia.
          </p>
        </div>
        <AdminSubjectDeletionControl
          subjectId={subject.id}
          name={subject.name}
          moduleCount={deletionEligibility.moduleCount}
          resourceCount={deletionEligibility.resourceCount}
          activeSubscriptionCount={deletionEligibility.activeSubscriptionCount}
          unresolvedPaymentCount={deletionEligibility.unresolvedPaymentCount}
        />
      </section>
    </div>
  );
}
