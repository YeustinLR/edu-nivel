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

  it("presents separate published revisions with their effective editorial state", async () => {
    const baseUpdatedAt = new Date("2026-09-20T12:00:00.000Z");
    const revisionUpdatedAt = new Date("2026-09-21T12:00:00.000Z");
    mocks.moduleFindMany
      .mockReset()
      .mockResolvedValueOnce([
        {
          id: "module-1",
          title: "Módulo publicado",
          description: "Descripción publicada",
          audience: "STUDENT",
          publicationStatus: "PUBLISHED",
          reviewNote: null,
          isActive: true,
          updatedAt: baseUpdatedAt,
          subject: {
            name: "Matemáticas",
            isActive: true,
            level: { levelNumber: 7, isActive: true },
          },
          revisions: [
            {
              status: "IN_REVIEW",
              payload: {
                title: "Módulo revisado",
                description: "Descripción revisada",
                audience: "BOTH",
              },
              reviewNote: null,
              updatedAt: revisionUpdatedAt,
            },
          ],
          resources: [
            {
              id: "resource-1",
              title: "Recurso publicado",
              type: "NOTE",
              publicationStatus: "PUBLISHED",
              reviewNote: null,
              isActive: true,
              revisions: [
                {
                  status: "CHANGES_REQUESTED",
                  payload: { title: "Recurso corregido" },
                  reviewNote: "Aclara el ejemplo.",
                },
              ],
            },
          ],
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getCollaboratorContentWorkspace("collaborator-1");

    expect(result.modules[0]).toMatchObject({
      title: "Módulo revisado",
      description: "Descripción revisada",
      audience: "BOTH",
      basePublicationStatus: "PUBLISHED",
      publicationStatus: "PUBLISHED",
      revisionStatus: "IN_REVIEW",
      updatedAt: revisionUpdatedAt,
      resources: [
        expect.objectContaining({
          title: "Recurso corregido",
          basePublicationStatus: "PUBLISHED",
          publicationStatus: "PUBLISHED",
          revisionStatus: "CHANGES_REQUESTED",
          reviewNote: "Aclara el ejemplo.",
        }),
      ],
    });
  });
});
