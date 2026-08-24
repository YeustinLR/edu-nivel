import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicationStatus, Role } from "@/generated/prisma/enums";
import { normalizeResourceContentForStorage } from "@/modules/content/domain/resource-document";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  moduleFindUnique: vi.fn(),
  intentCreate: vi.fn(),
  createPresignedUploadUrl: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/modules/content/domain/file-policy", () => ({
  FilePolicyError: class FilePolicyError extends Error {},
  getFilePolicy: () => ({ extension: "pdf" }),
}));
vi.mock("@/server/storage/r2", () => ({
  isR2UploadEnabled: () => true,
  createPresignedUploadUrl: mocks.createPresignedUploadUrl,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    module: { findUnique: mocks.moduleFindUnique },
    uploadIntent: {
      create: mocks.intentCreate,
      delete: vi.fn(),
    },
  },
}));

import { createContentUploadIntent } from "@/server/content/create-upload-intent";

const input = {
  moduleId: "module-1",
  resourceType: "PDF" as const,
  title: "Guía",
  instructions: "Resuelve los ejercicios después de leer",
  content: "Contenido de la guía",
  estimatedMinutes: 10,
  originalName: "guia.pdf",
  altText: undefined,
  mimeType: "application/pdf",
  sizeBytes: 1_024,
  disposition: "PUBLISH" as const,
};

describe("createContentUploadIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    mocks.moduleFindUnique.mockResolvedValue({
      id: "module-1",
      createdById: "collaborator-1",
      publicationStatus: PublicationStatus.PUBLISHED,
      isActive: true,
      subject: { isActive: true, level: { isActive: true } },
    });
    mocks.intentCreate.mockImplementation(({ data }) => ({
      ...data,
      id: "upload-1",
      expiresAt: new Date(Date.now() + 60_000),
    }));
    mocks.createPresignedUploadUrl.mockResolvedValue("https://upload.test");
  });

  it("permite que un administrador publique dentro de un módulo publicado", async () => {
    await createContentUploadIntent(input);

    expect(mocks.intentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        moduleId: "module-1",
        instructions: "Resuelve los ejercicios después de leer",
        content: normalizeResourceContentForStorage("Contenido de la guía"),
        estimatedMinutes: 10,
        targetPublicationStatus: PublicationStatus.PUBLISHED,
      }),
    });
  });

  it("permite publicar un archivo sin contenido escrito", async () => {
    await createContentUploadIntent({
      ...input,
      content: undefined,
      estimatedMinutes: undefined,
    });

    expect(mocks.intentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: null,
        estimatedMinutes: null,
      }),
    });
  });

  it("permite que el propietario colaborador envíe el recurso a revisión", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "collaborator-1",
      role: Role.COLLABORATOR,
    });

    await createContentUploadIntent({
      ...input,
      disposition: "SUBMIT_FOR_REVIEW",
    });

    expect(mocks.intentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetPublicationStatus: PublicationStatus.IN_REVIEW,
      }),
    });
  });

  it("rechaza publicación directa manipulada por un colaborador", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "collaborator-1",
      role: Role.COLLABORATOR,
    });

    await expect(createContentUploadIntent(input)).rejects.toMatchObject({
      code: "INVALID_DISPOSITION",
      status: 403,
    });
    expect(mocks.intentCreate).not.toHaveBeenCalled();
  });
});
