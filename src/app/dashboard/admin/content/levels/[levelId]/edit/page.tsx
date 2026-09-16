import { notFound } from "next/navigation";

import { ContentFormSurface } from "@/modules/content/components/admin/ContentFormSurface";
import { adminCatalogBreadcrumbs, ContentPageHeader } from "@/modules/content/components/admin/ContentPageHeader";
import { AdminLevelDeletionControl } from "@/modules/content/components/admin/detail/AdminLevelDeletionControl";
import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { EditLevelForm } from "@/modules/content/components/editor/EditLevelForm";
import { getLevelEditorData } from "@/server/content/content-detail-queries";
import { getLevelDeletionEligibility } from "@/server/content/delete-catalog-level";

export default async function EditAdminLevelPage({ params }: { params: Promise<{ levelId: string }> }) {
  const { levelId } = await params;
  const [level, deletionEligibility] = await Promise.all([
    getLevelEditorData(levelId),
    getLevelDeletionEligibility(levelId),
  ]);
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
      <ContentFormSurface
        aside={
          <ContentAvailabilityControl
            type="level"
            id={level.id}
            isActive={level.isActive}
            updatedAt={level.updatedAt.toISOString()}
            canChange
            variant="card"
          />
        }
      >
        <EditLevelForm
          level={{ ...level, updatedAt: level.updatedAt.toISOString() }}
          closeHref={levelHref}
        />
      </ContentFormSurface>

      <section
        className="rounded-2xl border border-red-500/20 bg-red-500/[0.025] p-5 sm:p-6"
        aria-labelledby="level-danger-zone-heading"
      >
        <div className="mb-5 border-b border-red-500/15 pb-4">
          <h2
            id="level-danger-zone-heading"
            className="font-semibold text-red-700 dark:text-red-300"
          >
            Zona de peligro
          </h2>
          <p className="mt-1 text-sm leading-5 text-muted">
            Estas acciones pueden afectar todo el contenido asociado al nivel.
          </p>
        </div>
        <AdminLevelDeletionControl
          levelId={level.id}
          levelNumber={level.levelNumber}
          activeSubscriptionCount={deletionEligibility.activeSubscriptionCount}
          unresolvedPaymentCount={deletionEligibility.unresolvedPaymentCount}
        />
      </section>
    </div>
  );
}
