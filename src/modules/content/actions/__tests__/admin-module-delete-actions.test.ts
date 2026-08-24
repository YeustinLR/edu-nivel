import { beforeEach, describe, expect, it, vi } from "vitest";

import { ContentAudience, Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => {
  class CatalogModuleDeletionError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
    }
  }

  return {
    CatalogModuleDeletionError,
    deleteCatalogModule: vi.fn(),
    requireRole: vi.fn(),
    revalidateContentPages: vi.fn(),
    redirect: vi.fn((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    }),
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/content/delete-catalog-module", () => ({
  CatalogModuleDeletionError: mocks.CatalogModuleDeletionError,
  deleteCatalogModule: mocks.deleteCatalogModule,
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
}));

import { deleteAdminModuleAction } from "@/modules/content/actions/admin-module-delete-actions";

function deletionForm(title = "Números naturales") {
  const formData = new FormData();
  formData.set("moduleId", "module-1");
  formData.set("confirmationTitle", title);
  return formData;
}

describe("deleteAdminModuleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    mocks.deleteCatalogModule.mockResolvedValue({
      subjectId: "subject-1",
      audience: ContentAudience.TEACHER,
    });
  });

  it("revalidates and returns to the matching subject audience", async () => {
    await expect(
      deleteAdminModuleAction({ status: "idle" }, deletionForm()),
    ).rejects.toThrow(
      "REDIRECT:/dashboard/admin/content/subjects/subject-1?audience=TEACHER",
    );

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.ADMIN);
    expect(mocks.deleteCatalogModule).toHaveBeenCalledWith(
      {
        moduleId: "module-1",
        confirmationTitle: "Números naturales",
      },
      { id: "admin-1", role: Role.ADMIN },
    );
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("authoring");
  });

  it("returns the title mismatch beside the confirmation field", async () => {
    mocks.deleteCatalogModule.mockRejectedValueOnce(
      new mocks.CatalogModuleDeletionError(
        "TITLE_MISMATCH",
        "El título de confirmación no coincide.",
      ),
    );

    await expect(
      deleteAdminModuleAction({ status: "idle" }, deletionForm()),
    ).resolves.toEqual({
      status: "error",
      message: "El título de confirmación no coincide.",
      fieldErrors: {
        confirmationTitle: ["El título de confirmación no coincide."],
      },
    });
    expect(mocks.revalidateContentPages).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects incomplete confirmation before checking authorization", async () => {
    const result = await deleteAdminModuleAction(
      { status: "idle" },
      deletionForm(""),
    );

    expect(result).toMatchObject({ status: "error" });
    expect(mocks.requireRole).not.toHaveBeenCalled();
    expect(mocks.deleteCatalogModule).not.toHaveBeenCalled();
  });
});
