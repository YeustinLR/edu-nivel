import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceType, Role } from "@/generated/prisma/enums";
import { createAdminStructuredResourceAction } from "@/modules/content/actions/admin-resource-creation-actions";
import { initialResourceCreationActionState } from "@/modules/content/types/resource-creation-action-state";
import { AuthGuardError } from "@/server/auth/guards";
import { ResourceCreationError } from "@/server/content/create-catalog-resource";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createCatalogStructuredResource: vi.fn(),
  revalidateContentPages: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/server/auth/guards", () => {
  class MockAuthGuardError extends Error {
    constructor(
      public readonly code: string,
      message: string,
      public readonly status = 403,
    ) {
      super(message);
      this.name = "AuthGuardError";
    }
  }

  return {
    AuthGuardError: MockAuthGuardError,
    requireRole: mocks.requireRole,
  };
});

vi.mock("@/server/content/create-catalog-resource", () => {
  class MockResourceCreationError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "ResourceCreationError";
    }
  }

  return {
    ResourceCreationError: MockResourceCreationError,
    createCatalogStructuredResource: mocks.createCatalogStructuredResource,
  };
});

vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
}));

function lessonFormData() {
  const formData = new FormData();
  formData.set("requestId", "734790ea-f53c-4f2c-a70c-22f13683c6f1");
  formData.set("moduleId", "module-1");
  formData.set("resourceType", ResourceType.LESSON);
  formData.set("title", "Introducción");
  formData.set("description", "Descripción");
  formData.set("content", "Contenido de la lección");
  formData.set("estimatedMinutes", "10");
  formData.set("disposition", "PUBLISH");
  return formData;
}

function noteFormData() {
  const formData = new FormData();
  formData.set("requestId", "734790ea-f53c-4f2c-a70c-22f13683c6f2");
  formData.set("moduleId", "module-1");
  formData.set("resourceType", ResourceType.NOTE);
  formData.set("title", "Recordatorio");
  formData.set("description", "Descripción opcional");
  formData.set("disposition", "DRAFT");
  return formData;
}

describe("admin structured resource creation action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
  });

  it("requires an administrator before creating the resource", async () => {
    mocks.requireRole.mockRejectedValue(
      new AuthGuardError("FORBIDDEN", "No tienes permisos."),
    );

    const result = await createAdminStructuredResourceAction(
      initialResourceCreationActionState,
      lessonFormData(),
    );

    expect(mocks.requireRole).toHaveBeenCalledWith([
      Role.ADMIN,
      Role.COLLABORATOR,
    ]);
    expect(mocks.createCatalogStructuredResource).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "error",
      message: "No tienes permisos.",
    });
  });

  it("creates a draft and returns its identifier", async () => {
    mocks.createCatalogStructuredResource.mockResolvedValue({
      id: "resource-1",
      title: "Introducción",
      type: ResourceType.LESSON,
    });

    const result = await createAdminStructuredResourceAction(
      initialResourceCreationActionState,
      lessonFormData(),
    );

    expect(mocks.createCatalogStructuredResource).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleId: "module-1",
        resourceType: ResourceType.LESSON,
        content: "Contenido de la lección",
        estimatedMinutes: 10,
      }),
      { id: "admin-1", role: Role.ADMIN },
    );
    expect(result).toEqual({
      status: "success",
      message: "Introducción fue publicado.",
      resourceId: "resource-1",
    });
    expect(mocks.revalidateContentPages).toHaveBeenCalledOnce();
  });

  it("lets a collaborator create a note without an attachment", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "collaborator-1",
      role: Role.COLLABORATOR,
    });
    mocks.createCatalogStructuredResource.mockResolvedValue({
      id: "resource-note",
      title: "Recordatorio",
      type: ResourceType.NOTE,
    });

    const result = await createAdminStructuredResourceAction(
      initialResourceCreationActionState,
      noteFormData(),
    );

    expect(mocks.createCatalogStructuredResource).toHaveBeenCalledWith(
      expect.objectContaining({ resourceType: ResourceType.NOTE }),
      { id: "collaborator-1", role: Role.COLLABORATOR },
    );
    expect(result).toMatchObject({
      status: "success",
      resourceId: "resource-note",
    });
  });

  it("does not grant structured attachments to a collaborator", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "collaborator-1",
      role: Role.COLLABORATOR,
    });

    const result = await createAdminStructuredResourceAction(
      initialResourceCreationActionState,
      lessonFormData(),
    );

    expect(mocks.createCatalogStructuredResource).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "error",
      message: "Tu rol solo puede crear notas sin adjunto desde este formulario.",
    });
  });

  it("maps a non-editable module to the contextual field", async () => {
    mocks.createCatalogStructuredResource.mockRejectedValue(
      new ResourceCreationError(
        "MODULE_NOT_EDITABLE",
        "No puedes añadir recursos en el estado editorial actual del módulo.",
      ),
    );

    const result = await createAdminStructuredResourceAction(
      initialResourceCreationActionState,
      lessonFormData(),
    );

    expect(result).toMatchObject({
      status: "error",
      fieldErrors: {
        moduleId: [
          "No puedes añadir recursos en el estado editorial actual del módulo.",
        ],
      },
    });
    expect(mocks.revalidateContentPages).not.toHaveBeenCalled();
  });
});
