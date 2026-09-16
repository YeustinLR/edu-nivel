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
    getResourceContentDetail: vi.fn(),
    revalidateContentPages: vi.fn(),
  };
});

vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/content/content-detail-queries", () => ({
  getResourceContentDetail: mocks.getResourceContentDetail,
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
  getWorkspaceResourceDetailAction,
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
    expect(mocks.requireRole).toHaveBeenCalledWith([
      Role.ADMIN,
      Role.COLLABORATOR,
    ]);
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
  });

  it("refreshes published consumers after resource reorder", async () => {
    const result = await reorderWorkspaceResourcesAction({
      subjectId: "subject-1",
      moduleId: "module-1",
      resourceIds: ["resource-1", "resource-2"],
    });

    expect(result.status).toBe("success");
    expect(mocks.requireRole).toHaveBeenCalledWith([
      Role.ADMIN,
      Role.COLLABORATOR,
    ]);
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

  it("loads a draft resource preview with admin authorization and its learner heading data", async () => {
    const resource = {
      id: "resource-draft",
      moduleId: "module-1",
      moduleTitle: "Fracciones",
      title: "Fracciones equivalentes",
      publicationStatus: "DRAFT",
      isActive: false,
      isRequired: true,
    };
    mocks.getResourceContentDetail.mockResolvedValue(resource);

    const result = await getWorkspaceResourceDetailAction({
      subjectId: "subject-1",
      moduleId: "module-1",
      resourceId: "resource-draft",
    });

    expect(mocks.requireRole).toHaveBeenCalledWith([Role.ADMIN, Role.COLLABORATOR]);
    expect(mocks.getResourceContentDetail).toHaveBeenCalledWith({
      resourceId: "resource-draft",
      expectedModuleId: "module-1",
      expectedSubjectId: "subject-1",
      actor: { id: "admin-1", role: Role.ADMIN },
    });
    expect(result).toEqual({ status: "success", resource });
  });
});
