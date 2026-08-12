import { ContentAvailabilityControl } from "@/modules/content/components/editor/ContentAvailabilityControl";
import { EditResourceForm } from "@/modules/content/components/editor/EditResourceForm";
import { ResourceContentView } from "@/modules/content/components/editor/ResourceContentView";
import type { ResourceContentDetail } from "@/server/content/content-detail-queries";

export function CollaboratorResourcePanel({
  resource,
}: {
  resource: ResourceContentDetail;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <ResourceContentView
        resource={resource}
        backHref="/dashboard/collaborator/content"
      />
      {resource.canEdit ? (
        <details className="mt-5 border-t border-border pt-4">
          <summary className="cursor-pointer text-sm font-medium text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
            Editar este recurso
          </summary>
          <div className="mt-4">
            <EditResourceForm
              resource={{
                ...resource,
                updatedAt: resource.updatedAt.toISOString(),
              }}
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
    </section>
  );
}
