import { EditorialControls } from "@/modules/content/components/admin/editorial/EditorialControls";
import { getAdminEditorialTransitions } from "@/modules/content/domain/editorial-workflow";
import type { AdminModuleDetail } from "@/server/content/admin-content-queries";

export function ModuleReviewWorkspace({
  detail,
  subjectId,
}: {
  detail: AdminModuleDetail;
  subjectId: string;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-muted">
        Los módulos se publican directamente. Los recursos mantienen su propio
        estado y, cuando los crea un colaborador, su revisión independiente.
      </p>
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
    </div>
  );
}
