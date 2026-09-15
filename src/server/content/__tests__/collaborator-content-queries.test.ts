import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  subjectFindMany: vi.fn(),
  moduleFindMany: vi.fn(),
  moduleCount: vi.fn(),
  resourceCount: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subject: { findMany: mocks.subjectFindMany },
    module: {
      findMany: mocks.moduleFindMany,
      count: mocks.moduleCount,
    },
    resource: { count: mocks.resourceCount },
  },
}));

import {
  COLLABORATOR_TEAM_PAGE_SIZE,
  getCollaboratorContentWorkspace,
  normalizeCollaboratorTeamPage,
} from "@/server/content/collaborator-content-queries";

describe("collaborator team catalog pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subjectFindMany.mockResolvedValue([]);
    mocks.moduleFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mocks.moduleCount.mockResolvedValue(25);
    mocks.resourceCount.mockResolvedValue(4);
  });

  it.each([undefined, "", "0", "-1", "1.2", "no"])(
    "normalizes invalid page %j",
    (value) => expect(normalizeCollaboratorTeamPage(value)).toBe(1),
  );

  it("paginates modules after applying the selected audience", async () => {
    const result = await getCollaboratorContentWorkspace("collaborator-1", {
      teamAudience: "TEACHER",
      teamPage: 3,
    });

    expect(mocks.moduleCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        createdById: { not: "collaborator-1" },
        audience: { in: ["TEACHER", "BOTH"] },
      }),
    });
    expect(mocks.moduleFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        skip: COLLABORATOR_TEAM_PAGE_SIZE * 2,
        take: COLLABORATOR_TEAM_PAGE_SIZE,
        where: expect.objectContaining({
          audience: { in: ["TEACHER", "BOTH"] },
        }),
      }),
    );
    expect(result.teamPagination).toEqual({
      audience: "TEACHER",
      page: 3,
      pageSize: COLLABORATOR_TEAM_PAGE_SIZE,
      totalItems: 25,
      totalPages: 3,
    });
    expect(result.resourceCount).toBe(4);
  });
});
