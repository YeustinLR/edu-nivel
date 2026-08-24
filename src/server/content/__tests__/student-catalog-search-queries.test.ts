import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getPublishedStudentCatalog: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/content/published-academic-catalog-queries", () => ({
  getPublishedStudentCatalog: mocks.getPublishedStudentCatalog,
}));

import { getStudentCatalogSearchItems } from "@/server/content/student-catalog-search-queries";

describe("student catalog search queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "student-1", role: Role.STUDENT });
    mocks.getPublishedStudentCatalog.mockResolvedValue([
      {
        id: "level-7",
        levelNumber: 7,
        subjects: [
          {
            id: "subject-math",
            name: "Matemáticas",
            modules: [
              {
                id: "module-fractions",
                title: "Fracciones",
                resources: [{ id: "resource-pdf", title: "Ejercicios", type: "PDF" }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("returns searchable published metadata without premium fields", async () => {
    const result = await getStudentCatalogSearchItems();

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.STUDENT);
    expect(result.map((item) => item.kind)).toEqual([
      "level",
      "subject",
      "module",
      "resource",
    ]);
    expect(result[0]).toMatchObject({
      label: "Séptimo año",
      href: "/dashboard/student/explore?stage=secondary&level=level-7",
    });
    expect(result[3].href).toContain("subject=subject-math#explore-modules");

    expect(mocks.getPublishedStudentCatalog).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toMatch(
      /storageKey|signedUrl|videoId|lesson|didacticResource|privateUrl|gameConfig/,
    );
  });
});
