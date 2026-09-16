import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCatalog: vi.fn(),
  getLevelEditorData: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/server/content/admin-content-queries", () => ({
  getAdminContentCatalog: mocks.getCatalog,
}));
vi.mock("@/server/content/content-detail-queries", () => ({
  getLevelEditorData: mocks.getLevelEditorData,
}));
import { ContentLevelView } from "@/modules/content/components/catalog/ContentLevelView";

describe("ContentLevelView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCatalog.mockResolvedValue([
      {
        id: "level-1",
        levelNumber: 7,
        description: "Sétimo año",
        isActive: true,
        subjects: [
          {
            id: "subject-1",
            name: "Matemáticas",
            isActive: true,
            moduleCount: 2,
          },
        ],
      },
    ]);
    mocks.getLevelEditorData.mockResolvedValue({
      updatedAt: new Date("2026-09-16T12:00:00.000Z"),
      requiresSubscription: true,
    });
  });

  it("keeps level management out of the catalog view", async () => {
    const view = await ContentLevelView({
      levelId: "level-1",
      contentRootHref: "/dashboard/admin/content",
      canManageStructure: true,
    });
    const html = renderToStaticMarkup(view);

    expect(html).toContain("Materias");
    expect(html).not.toContain("Gestión del nivel");
    expect(html).not.toContain("Eliminar nivel");
  });
});
