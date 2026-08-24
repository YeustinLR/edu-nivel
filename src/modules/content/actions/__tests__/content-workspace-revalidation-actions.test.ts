import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => {
  class ContentReorderError extends Error {}
  class DuplicateModuleError extends Error {}

  return {
    ContentReorderError,
    DuplicateModuleError,
    requireRole: vi.fn(),
    reorderCatalogModules: vi.fn(),
    reorderCatalogResources: vi.fn(),
    duplicateCatalogModule: vi.fn(),
    revalidateContentPages: vi.fn(),
  };
});

vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/content/content-detail-queries", () => ({
  getResourceContentDetail: vi.fn(),
}));
vi.mock("@/server/content/reorder-catalog-content", () => ({
  ContentReorderError: mocks.ContentReorderError,
  reorderCatalogModules: mocks.reorderCatalogModules,
  reorderCatalogResources: mocks.reorderCatalogResources,
}));
vi.mock("@/server/content/duplicate-catalog-module", () => ({
  DuplicateModuleError: mocks.DuplicateModuleError,
  duplicateCatalogModule: mocks.duplicateCatalogModule,
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
}));

import {
  duplicateWorkspaceModuleAction,
  reorderWorkspaceModulesAction,
  reorderWorkspaceResourcesAction,
} from "@/modules/content/actions/content-workspace-actions";

describe("content workspace revalidation scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    mocks.reorderCatalogModules.mockResolvedValue(undefined);
    mocks.reorderCatalogResources.mockResolvedValue(undefined);
    mocks.duplicateCatalogModule.mockResolvedValue({
      id: "module-copy",
      title: "Módulo (copia)",
    });
  });

  it("refreshes published consumers after module reorder", async () => {
    const result = await reorderWorkspaceModulesAction({
      subjectId: "subject-1",
      moduleIds: ["module-1", "module-2"],
    });

    expect(result.status).toBe("success");
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
  });

  it("refreshes published consumers after resource reorder", async () => {
    const result = await reorderWorkspaceResourcesAction({
      subjectId: "subject-1",
      moduleId: "module-1",
      resourceIds: ["resource-1", "resource-2"],
    });

    expect(result.status).toBe("success");
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
  });

  it("keeps a duplicated draft module inside authoring surfaces", async () => {
    const result = await duplicateWorkspaceModuleAction({
      subjectId: "subject-1",
      moduleId: "module-1",
    });

    expect(result).toMatchObject({ status: "success", entityId: "module-copy" });
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("authoring");
  });
});
