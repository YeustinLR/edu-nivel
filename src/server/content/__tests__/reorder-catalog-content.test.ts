import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  lockRows: vi.fn(),
  moduleFindFirst: vi.fn(),
  moduleUpdate: vi.fn(),
  resourceUpdate: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import {
  reorderCatalogModules,
  reorderCatalogResources,
} from "@/server/content/reorder-catalog-content";

const actor = { id: "admin-1", role: Role.ADMIN };

describe("catalog content reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (operation: (client: unknown) => unknown) =>
        operation({
          $queryRaw: mocks.lockRows,
          module: {
            findFirst: mocks.moduleFindFirst,
            update: mocks.moduleUpdate,
          },
          resource: { update: mocks.resourceUpdate },
        }),
    );
    mocks.moduleFindFirst.mockResolvedValue({ id: "module-1" });
    mocks.moduleUpdate.mockResolvedValue({ id: "module-1" });
    mocks.resourceUpdate.mockResolvedValue({ id: "resource-1" });
  });

  it("persists every module position after validating the complete set", async () => {
    mocks.lockRows.mockResolvedValue([
      { id: "module-1" },
      { id: "module-2" },
    ]);

    await reorderCatalogModules(
      { subjectId: "subject-1", moduleIds: ["module-2", "module-1"] },
      actor,
    );

    expect(mocks.moduleUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: "module-2" },
      data: { order: 0 },
    });
    expect(mocks.moduleUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: "module-1" },
      data: { order: 1 },
    });
  });

  it("rejects a partial module list instead of corrupting global order", async () => {
    mocks.lockRows.mockResolvedValue([
      { id: "module-1" },
      { id: "module-2" },
    ]);

    await expect(
      reorderCatalogModules(
        { subjectId: "subject-1", moduleIds: ["module-1"] },
        actor,
      ),
    ).rejects.toMatchObject({ code: "CONTEXT_MISMATCH" });
    expect(mocks.moduleUpdate).not.toHaveBeenCalled();
  });

  it("validates the module-subject relationship before reordering resources", async () => {
    mocks.moduleFindFirst.mockResolvedValueOnce(null);

    await expect(
      reorderCatalogResources(
        {
          subjectId: "subject-2",
          moduleId: "module-1",
          resourceIds: ["resource-1"],
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: "CONTEXT_MISMATCH" });
    expect(mocks.resourceUpdate).not.toHaveBeenCalled();
  });

  it("reserves reorder operations for administrators", async () => {
    await expect(
      reorderCatalogModules(
        { subjectId: "subject-1", moduleIds: ["module-1"] },
        { id: "collaborator-1", role: Role.COLLABORATOR },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
