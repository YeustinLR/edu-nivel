import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentAudience, Role } from "@/generated/prisma/enums";
import { initialContentEditActionState } from "@/modules/content/types/content-edit-action-state";

const mocks = vi.hoisted(() => {
  class AuthGuardError extends Error {}
  class ContentUpdateError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
    }
  }

  return {
    AuthGuardError,
    ContentUpdateError,
    requireRole: vi.fn(),
    updateCatalogLevel: vi.fn(),
    updateCatalogModule: vi.fn(),
    updateCatalogResource: vi.fn(),
    updateCatalogSubject: vi.fn(),
    setCatalogContentAvailability: vi.fn(),
    revalidateContentPages: vi.fn(),
  };
});

vi.mock("@/server/auth/guards", () => ({
  AuthGuardError: mocks.AuthGuardError,
  requireRole: mocks.requireRole,
}));
vi.mock("@/server/content/update-content", () => ({
  ContentUpdateError: mocks.ContentUpdateError,
  updateCatalogLevel: mocks.updateCatalogLevel,
  updateCatalogModule: mocks.updateCatalogModule,
  updateCatalogResource: mocks.updateCatalogResource,
  updateCatalogSubject: mocks.updateCatalogSubject,
}));
vi.mock("@/server/content/set-content-availability", () => ({
  setCatalogContentAvailability: mocks.setCatalogContentAvailability,
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
}));

import { updateModuleContentAction } from "@/modules/content/actions/content-edit-actions";

function moduleForm() {
  const data = new FormData();
  data.set("id", "module-1");
  data.set("expectedUpdatedAt", "2026-08-22T12:00:00.000Z");
  data.set("title", "Módulo actualizado");
  data.set("description", "Descripción actualizada");
  data.set("audience", ContentAudience.BOTH);
  return data;
}

describe("content edit revalidation scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
  });

  it("keeps a draft module edit inside authoring surfaces", async () => {
    mocks.updateCatalogModule.mockResolvedValue({
      affectsPublishedContent: false,
    });

    const result = await updateModuleContentAction(
      initialContentEditActionState,
      moduleForm(),
    );

    expect(result.status).toBe("success");
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("authoring");
  });

  it("refreshes learner surfaces when an editable published module changes", async () => {
    mocks.updateCatalogModule.mockResolvedValue({
      affectsPublishedContent: true,
    });

    const result = await updateModuleContentAction(
      initialContentEditActionState,
      moduleForm(),
    );

    expect(result.status).toBe("success");
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
  });
});
