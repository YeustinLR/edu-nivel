import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentAudience } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  moduleCount: vi.fn(),
  moduleFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    module: {
      count: mocks.moduleCount,
      findMany: mocks.moduleFindMany,
    },
  },
}));

import { getAdminModulesPage } from "@/server/content/admin-module-list-queries";

describe("admin module list queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.moduleFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mocks.moduleCount.mockResolvedValue(0);
  });

  it("filters teacher views to teacher and shared modules", async () => {
    await getAdminModulesPage({
      subjectId: "subject-1",
      audience: "TEACHER",
      page: 1,
      pageSize: 10,
    });

    const expectedAudience = {
      in: [ContentAudience.TEACHER, ContentAudience.BOTH],
    };
    expect(mocks.moduleFindMany.mock.calls[0][0].where).toEqual({
      subjectId: "subject-1",
      audience: expectedAudience,
    });
    expect(mocks.moduleCount).toHaveBeenCalledWith({
      where: {
        subjectId: "subject-1",
        audience: expectedAudience,
      },
    });
    expect(mocks.moduleFindMany.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        where: {
          subjectId: "subject-1",
          audience: expectedAudience,
        },
      }),
    );
  });
});
