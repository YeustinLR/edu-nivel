import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
} from "@/generated/prisma/enums";
import { WorkspaceModuleCard } from "@/modules/content/components/admin/workspace/WorkspaceModuleCard";

describe("WorkspaceModuleCard", () => {
  it("renders reorder controls and a draggable handle when reordering is allowed", () => {
    const html = renderToStaticMarkup(
      <WorkspaceModuleCard
        moduleRecord={{
          id: "module-1",
          title: "Fracciones",
          description: null,
          audience: ContentAudience.STUDENT,
          publicationStatus: PublicationStatus.DRAFT,
          isActive: true,
          authorName: "Ana",
          updatedAt: "2026-09-16T12:00:00.000Z",
          order: 0,
          canEdit: true,
          canAddResource: true,
          canArchive: true,
          canReactivate: false,
          canSubmitForReview: true,
          canApprove: false,
          revisionStatus: null,
          lastEditorName: "Ana",
          resources: [],
        }}
        position={1}
        moduleCount={2}
        visibleResources={[]}
        open={false}
        now="2026-09-16T12:00:00.000Z"
        canReorderModules
        canReorderResources
        pending={false}
        dragging={false}
        dragTarget={false}
        onToggle={() => undefined}
        onDragStart={() => undefined}
        onDragOverModule={() => undefined}
        onDragEnd={() => undefined}
        onDropModule={() => undefined}
        onEditModule={() => undefined}
        onAddResource={() => undefined}
        onDuplicate={() => undefined}
        onModuleEditorial={() => undefined}
        onModuleAvailability={() => undefined}
        onMoveModule={() => undefined}
        onPreviewResource={() => undefined}
        onEditResource={() => undefined}
        onResourceEditorial={() => undefined}
        onResourceAvailability={() => undefined}
        onMoveResource={() => undefined}
        onDropResource={() => undefined}
        canDuplicate={false}
        editorialLabel="Enviar a revisión"
        moduleHref="/dashboard/collaborator/content/modules/module-1"
      />,
    );

    expect(html).toContain("Mover arriba");
    expect(html).toContain("Mover abajo");
    expect(html).toContain('draggable="true"');
  });
});
