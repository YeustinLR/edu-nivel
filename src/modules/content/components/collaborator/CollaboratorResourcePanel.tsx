import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { ResourceCreationToast } from "@/modules/content/components/creation/ResourceCreationToast";
import { EditResourceForm } from "@/modules/content/components/editor/EditResourceForm";
import { ResourceContentView } from "@/modules/content/components/editor/ResourceContentView";
import type { ResourceContentDetail } from "@/server/content/content-detail-queries";
import { EditorialControls } from "@/modules/content/components/admin/editorial/EditorialControls";
import { getCollaboratorEditorialTransitions } from "@/modules/content/domain/editorial-workflow";
import type { PublicationStatus } from "@/generated/prisma/enums";

export function CollaboratorResourcePanel({
  resource,
  initiallyEditing = false,
  creationNotice,
  backHref = "/dashboard/collaborator/content",
}: {
  resource: ResourceContentDetail;
  initiallyEditing?: boolean;
  creationNotice?: string;
  backHref?: string;
}) {
  const effectiveStatus = (resource.revisionStatus ?? resource.publicationStatus) as PublicationStatus;
  const transitions = getCollaboratorEditorialTransitions("resource", effectiveStatus);
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <ResourceContentView
        resource={resource}
        backHref={backHref}
      />
      {resource.revisionStatus ? (
        <p role="status" className="mt-4 rounded-lg border border-secondary/20 bg-secondary/5 px-3 py-2 text-sm text-foreground">
          Este recurso conserva su versión publicada mientras la revisión está {resource.revisionStatus === "IN_REVIEW" ? "pendiente" : "en preparación"}. Última edición: {resource.lastEditorName}.
        </p>
      ) : null}
      {resource.canEdit ? (
        <details
          id="resource-editor"
          open={initiallyEditing}
          className="mt-5 border-t border-border pt-4"
        >
          <summary className="cursor-pointer text-sm font-medium text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
            Editar este recurso
          </summary>
          <div className="mt-4">
            <EditResourceForm
              resource={{
                ...resource,
                updatedAt: resource.updatedAt.toISOString(),
              }}
              submitForReview={resource.publicationStatus === "PUBLISHED"}
            />
            <ContentAvailabilityControl
              type="resource"
              id={resource.id}
              isActive={resource.isActive}
              updatedAt={resource.updatedAt.toISOString()}
              canChange={
                resource.isActive
                  ? resource.canArchive
                  : resource.canReactivate
              }
              unavailableReason="Retira el recurso de revisión o solicita al administrador que lo despublique."
            />
          </div>
        </details>
      ) : null}
      {transitions.length > 0 ? (
        <div className="mt-5 border-t border-border pt-4">
          <EditorialControls targetType="resource" targetId={resource.id} parentId={resource.moduleId} transitions={transitions} targetTitle={resource.title} />
        </div>
      ) : null}
      <ResourceCreationToast
        message={creationNotice}
        clearParams={["notice", "edit"]}
      />
    </section>
  );
}
