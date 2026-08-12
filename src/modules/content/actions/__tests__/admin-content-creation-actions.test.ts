import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentAudience, Role } from "@/generated/prisma/enums";
import {
  createAdminLevelAction,
  createAdminModuleAction,
  createAdminSubjectAction,
} from "@/modules/content/actions/admin-content-creation-actions";
import { initialContentCreationActionState } from "@/modules/content/types/content-creation-action-state";
import { AuthGuardError } from "@/server/auth/guards";
import { CatalogCreationError } from "@/server/content/create-catalog-content";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createCatalogLevel: vi.fn(),
  createCatalogSubject: vi.fn(),
  createCatalogModule: vi.fn(),
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

vi.mock("@/server/content/create-catalog-content", () => {
  class MockCatalogCreationError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
      this.name = "CatalogCreationError";
    }
  }

  return {
    CatalogCreationError: MockCatalogCreationError,
    createCatalogLevel: mocks.createCatalogLevel,
    createCatalogSubject: mocks.createCatalogSubject,
    createCatalogModule: mocks.createCatalogModule,
  };
});

vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
}));

function levelFormData() {
  const formData = new FormData();
  formData.set("levelNumber", "12");
  formData.set("description", "Nivel temporal");
  formData.set("requiresSubscription", "on");
  return formData;
}

function subjectFormData() {
  const formData = new FormData();
  formData.set("levelId", "level-1");
  formData.set("name", "Ciencias");
  formData.set("description", "Materia temporal");
  return formData;
}

function moduleFormData() {
  const formData = new FormData();
  formData.set("subjectId", "subject-1");
  formData.set("title", "Seres vivos");
  formData.set("description", "Módulo temporal");
  formData.set("audience", ContentAudience.STUDENT);
  formData.set("disposition", "PUBLISH");
  return formData;
}

describe("admin content creation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
  });

  it.each([
    [createAdminLevelAction, levelFormData, mocks.createCatalogLevel],
    [createAdminSubjectAction, subjectFormData, mocks.createCatalogSubject],
    [createAdminModuleAction, moduleFormData, mocks.createCatalogModule],
  ] as const)(
    "requires ADMIN before persisting valid input",
    async (action, getFormData, createMock) => {
      mocks.requireRole.mockRejectedValue(
        new AuthGuardError("FORBIDDEN", "No tienes permisos."),
      );

      const result = await action(
        initialContentCreationActionState,
        getFormData(),
      );

      expect(mocks.requireRole).toHaveBeenCalledWith(Role.ADMIN);
      expect(createMock).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        status: "error",
        message: "No tienes permisos.",
      });
      expect(mocks.revalidateContentPages).not.toHaveBeenCalled();
    },
  );

  it("creates a level and returns its catalog destination", async () => {
    mocks.createCatalogLevel.mockResolvedValue({
      id: "level-12",
      levelNumber: 12,
    });

    const result = await createAdminLevelAction(
      initialContentCreationActionState,
      levelFormData(),
    );

    expect(mocks.createCatalogLevel).toHaveBeenCalledWith({
      levelNumber: 12,
      description: "Nivel temporal",
      requiresSubscription: true,
    });
    expect(result).toMatchObject({
      status: "success",
      destinationHref: "/dashboard/admin/content/levels/level-12",
    });
    expect(mocks.revalidateContentPages).toHaveBeenCalledOnce();
  });

  it("creates a subject and returns its selected context", async () => {
    mocks.createCatalogSubject.mockResolvedValue({
      id: "subject-1",
      name: "Ciencias",
      levelId: "level-1",
    });

    const result = await createAdminSubjectAction(
      initialContentCreationActionState,
      subjectFormData(),
    );

    expect(mocks.createCatalogSubject).toHaveBeenCalledWith({
      levelId: "level-1",
      name: "Ciencias",
      description: "Materia temporal",
    });
    expect(result).toMatchObject({
      status: "success",
      destinationHref: "/dashboard/admin/content/subjects/subject-1",
    });
    expect(mocks.revalidateContentPages).toHaveBeenCalledOnce();
  });

  it("returns a field error when the selected level is inactive", async () => {
    mocks.createCatalogSubject.mockRejectedValue(
      new CatalogCreationError(
        "LEVEL_NOT_ACTIVE",
        "Solo puedes crear materias dentro de un nivel activo.",
      ),
    );

    const result = await createAdminSubjectAction(
      initialContentCreationActionState,
      subjectFormData(),
    );

    expect(result).toMatchObject({
      status: "error",
      fieldErrors: {
        levelId: ["Solo puedes crear materias dentro de un nivel activo."],
      },
    });
    expect(mocks.revalidateContentPages).not.toHaveBeenCalled();
  });

  it("creates a module as the authenticated administrator", async () => {
    mocks.createCatalogModule.mockResolvedValue({
      id: "module-1",
      title: "Seres vivos",
      levelId: "level-1",
      subjectId: "subject-1",
      publicationStatus: "PUBLISHED",
    });

    const result = await createAdminModuleAction(
      initialContentCreationActionState,
      moduleFormData(),
    );

    expect(mocks.createCatalogModule).toHaveBeenCalledWith(
      {
        subjectId: "subject-1",
        title: "Seres vivos",
        description: "Módulo temporal",
        audience: ContentAudience.STUDENT,
        disposition: "PUBLISH",
      },
      "admin-1",
    );
    expect(result).toMatchObject({
      status: "success",
      destinationHref: "/dashboard/admin/content/modules/module-1",
    });
    expect(mocks.revalidateContentPages).toHaveBeenCalledOnce();
  });
});
