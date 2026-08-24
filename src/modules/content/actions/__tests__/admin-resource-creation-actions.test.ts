import { beforeEach, describe, expect, it, vi } from "vitest";

import { ResourceType, Role } from "@/generated/prisma/enums";
import {
  MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES,
  getResourceDocumentByteLength,
  normalizeResourceContentForStorage,
  normalizeResourceDocument,
  serializeResourceDocument,
} from "@/modules/content/domain/resource-document";
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

function youtubeFormData() {
  const formData = new FormData();
  formData.set("requestId", "734790ea-f53c-4f2c-a70c-22f13683c6f1");
  formData.set("moduleId", "module-1");
  formData.set("resourceType", ResourceType.YOUTUBE);
  formData.set("title", "Introducción");
  formData.set("instructions", "Observa el video y toma apuntes");
  formData.set("content", "Contenido de la lección");
  formData.set("estimatedMinutes", "10");
  formData.set("videoId", "dQw4w9WgXcQ");
  formData.set("disposition", "PUBLISH");
  return formData;
}

function noteFormData() {
  const formData = new FormData();
  formData.set("requestId", "734790ea-f53c-4f2c-a70c-22f13683c6f2");
  formData.set("moduleId", "module-1");
  formData.set("resourceType", ResourceType.NOTE);
  formData.set("title", "Recordatorio");
  formData.set("instructions", "Lee el contenido con atención");
  formData.set("content", "Contenido del recordatorio");
  formData.set("disposition", "DRAFT");
  return formData;
}

function largeTableContent(padding: number, validate = true) {
  const rows = Array.from({ length: 100 }, (_, rowIndex) => ({
    cells: Array.from({ length: 33 }, (_, cellIndex) =>
      rowIndex === 0 && cellIndex === 0 ? "x".repeat(padding) : "",
    ),
  }));
  const document = normalizeResourceDocument([
    { id: "transport-table", type: "table", props: {}, content: { type: "tableContent", rows }, children: [] },
  ]);
  return validate ? serializeResourceDocument(document) : JSON.stringify(document);
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
      youtubeFormData(),
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
      type: ResourceType.YOUTUBE,
    });

    const result = await createAdminStructuredResourceAction(
      initialResourceCreationActionState,
      youtubeFormData(),
    );

    expect(mocks.createCatalogStructuredResource).toHaveBeenCalledWith(
      expect.objectContaining({
        moduleId: "module-1",
        resourceType: ResourceType.YOUTUBE,
        instructions: "Observa el video y toma apuntes",
        content: normalizeResourceContentForStorage("Contenido de la lección"),
        estimatedMinutes: 10,
      }),
      { id: "admin-1", role: Role.ADMIN },
    );
    expect(result).toEqual({
      status: "success",
      message: "Introducción fue publicado.",
      resourceId: "resource-1",
    });
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
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
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("authoring");
  });

  it("passes a valid FormData document close to 512 KiB without truncation", async () => {
    const content = largeTableContent(14_000);
    expect(getResourceDocumentByteLength(content)).toBeGreaterThan(
      MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES - 2_048,
    );
    mocks.createCatalogStructuredResource.mockResolvedValue({
      id: "large-resource",
      title: "Documento grande",
      type: ResourceType.NOTE,
    });
    const formData = noteFormData();
    formData.set("title", "Documento grande");
    formData.set("content", content);

    await expect(
      createAdminStructuredResourceAction(initialResourceCreationActionState, formData),
    ).resolves.toMatchObject({ status: "success", resourceId: "large-resource" });
    expect(mocks.createCatalogStructuredResource).toHaveBeenCalledWith(
      expect.objectContaining({ content }),
      expect.any(Object),
    );
  });

  it("rejects an oversized FormData document in domain validation", async () => {
    const content = largeTableContent(15_000, false);
    expect(getResourceDocumentByteLength(content)).toBeGreaterThan(
      MAX_SERIALIZED_RESOURCE_DOCUMENT_BYTES,
    );
    const formData = noteFormData();
    formData.set("content", content);

    const result = await createAdminStructuredResourceAction(
      initialResourceCreationActionState,
      formData,
    );
    expect(result).toMatchObject({
      status: "error",
      fieldErrors: { content: ["El documento no puede superar 512 KiB."] },
    });
    expect(mocks.createCatalogStructuredResource).not.toHaveBeenCalled();
  });

  it("does not grant structured attachments to a collaborator", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "collaborator-1",
      role: Role.COLLABORATOR,
    });

    const result = await createAdminStructuredResourceAction(
      initialResourceCreationActionState,
      youtubeFormData(),
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
      youtubeFormData(),
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
