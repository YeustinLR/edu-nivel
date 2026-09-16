import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PublicationStatus, ResourceType } from "@/generated/prisma/enums";
import { WorkspaceResourceList } from "@/modules/content/components/admin/workspace/WorkspaceResourceList";

describe("WorkspaceResourceList", () => {
  it("associates the preview button with a visible-on-hover-or-focus tooltip", () => {
    const html = renderToStaticMarkup(
      <WorkspaceResourceList
        moduleId="module-1"
        resources={[
          {
            id: "resource-1",
            title: "Fracciones equivalentes",
            instructions: null,
            type: ResourceType.NOTE,
            publicationStatus: PublicationStatus.DRAFT,
            isActive: true,
            authorName: "Docente",
            updatedAt: "2026-09-10T12:00:00.000Z",
            order: 0,
            information: null,
            canEdit: false,
            canArchive: true,
    canReactivate: false,
    canSubmitForReview: false,
    canApprove: false,
    revisionStatus: null,
    lastEditorName: "Ana",
          },
        ]}
        totalResourceCount={1}
        now="2026-09-10T12:00:00.000Z"
        canReorder
        pending={false}
        onPreview={() => undefined}
        onEdit={() => undefined}
        onEditorial={() => undefined}
        onAvailability={() => undefined}
        onMove={() => undefined}
        onDrop={() => undefined}
      />,
    );

    expect(html).toContain('aria-label="Vista previa de Fracciones equivalentes"');
    expect(html).toContain('aria-describedby="preview-tooltip-resource-1"');
    expect(html).toContain('id="preview-tooltip-resource-1"');
    expect(html).toContain('role="tooltip"');
    expect(html).toContain("group-hover/preview:opacity-100");
    expect(html).toContain("group-focus-within/preview:opacity-100");
    expect(html).toContain("Vista previa");
    expect(html).toContain("Mover arriba");
    expect(html).toContain("Mover abajo");
    expect(html).toContain('draggable="true"');
  });
});
