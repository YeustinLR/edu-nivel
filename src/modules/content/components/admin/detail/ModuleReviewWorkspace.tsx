import { EditorialControls } from "@/modules/content/components/admin/editorial/EditorialControls";
import { AdminModuleDeletionControl } from "@/modules/content/components/admin/detail/AdminModuleDeletionControl";
import { getAdminEditorialTransitions } from "@/modules/content/domain/editorial-workflow";
import type { AdminModuleDetail } from "@/server/content/admin-content-queries";

export function ModuleReviewWorkspace({
  detail,
  subjectId,
  activeSubscriptionCount,
  unresolvedPaymentCount,
}: {
  detail: AdminModuleDetail;
  subjectId: string;
  activeSubscriptionCount: number;
  unresolvedPaymentCount: number;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted">
        Los módulos se publican directamente. Los recursos mantienen su propio
        estado y, cuando los crea un colaborador, su revisión independiente.
      </p>
      {detail.isActive ? (
        <EditorialControls
          targetType="module"
          targetId={detail.id}
          parentId={subjectId}
          transitions={getAdminEditorialTransitions(
            "module",
            detail.publicationStatus,
          )}
          layout="stacked"
          targetTitle={detail.title}
        />
      ) : (
        <p className="text-xs leading-5 text-muted">
          Reactiva el módulo antes de cambiar su publicación.
        </p>
      )}
      <AdminModuleDeletionControl
        moduleId={detail.id}
        title={detail.title}
        resourceCount={detail.resourceCount}
        activeSubscriptionCount={activeSubscriptionCount}
        unresolvedPaymentCount={unresolvedPaymentCount}
      />
    </div>
  );
}
