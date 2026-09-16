import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  moduleFindMany: vi.fn(),
  resourceFindMany: vi.fn(),
  revisionFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    module: { findMany: mocks.moduleFindMany },
    resource: { findMany: mocks.resourceFindMany },
    contentRevision: { findMany: mocks.revisionFindMany },
  },
}));

import { getCollaboratorDashboardData } from "@/server/dashboard/collaborator-dashboard-queries";

const now = new Date("2026-09-15T18:00:00.000Z");
const subject = {
  name: "Matemáticas",
  level: { levelNumber: 5 },
};

describe("collaborator dashboard queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.moduleFindMany.mockResolvedValue([]);
    mocks.resourceFindMany.mockResolvedValue([]);
    mocks.revisionFindMany.mockResolvedValue([]);
  });

  it("combines global attention with personal drafts and submitted work", async () => {
    mocks.moduleFindMany
      .mockResolvedValueOnce([
        {
          id: "module-changes",
          title: "Fracciones equivalentes",
          publicationStatus: "CHANGES_REQUESTED",
          reviewNote: "Agrega un ejemplo visual.",
          updatedAt: new Date("2026-09-15T17:50:00.000Z"),
          createdBy: { name: "Ana" },
          updatedBy: { name: "Carlos" },
          subject,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "module-draft",
          title: "Geometría básica",
          publicationStatus: "DRAFT",
          reviewNote: null,
          updatedAt: new Date("2026-09-15T17:40:00.000Z"),
          createdBy: { name: "María" },
          updatedBy: { name: "María" },
          subject,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "module-review",
          title: "Números enteros",
          publicationStatus: "IN_REVIEW",
          reviewNote: null,
          submittedForReviewAt: new Date("2026-09-15T17:30:00.000Z"),
          updatedAt: new Date("2026-09-15T17:30:00.000Z"),
          createdBy: { name: "María" },
          updatedBy: { name: "María" },
          subject,
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await getCollaboratorDashboardData("collaborator-1");

    expect(result.attention).toEqual([
      expect.objectContaining({
        id: "module-changes",
        title: "Fracciones equivalentes",
        reviewNote: "Agrega un ejemplo visual.",
        lastEditorName: "Carlos",
      }),
    ]);
    expect(result.continueWorking).toEqual([
      expect.objectContaining({
        id: "module-draft",
        status: "DRAFT",
        href: "/dashboard/collaborator/content/modules/module-draft",
      }),
    ]);
    expect(result.inReview).toEqual([
      expect.objectContaining({
        id: "module-review",
        status: "IN_REVIEW",
      }),
    ]);
  });

  it("describes the latest team action with its actor", async () => {
    mocks.moduleFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "module-activity",
          title: "Álgebra inicial",
          publicationStatus: "CHANGES_REQUESTED",
          updatedAt: now,
          submittedForReviewAt: new Date("2026-09-15T16:00:00.000Z"),
          reviewedAt: now,
          createdBy: { name: "María" },
          updatedBy: { name: "María" },
          submittedBy: { name: "María" },
          reviewedBy: { name: "Administrador" },
        },
      ]);

    const result = await getCollaboratorDashboardData("collaborator-1");

    expect(result.teamActivity[0]).toMatchObject({
      actorName: "Administrador",
      action: "solicitó cambios en",
      title: "Álgebra inicial",
      href: "/dashboard/collaborator/content/modules/module-activity",
    });
  });
});
