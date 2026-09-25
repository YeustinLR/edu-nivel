import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => {
  class CatalogSubjectDeletionError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
    }
  }

  return {
    CatalogSubjectDeletionError,
    deleteCatalogSubject: vi.fn(),
    requireRole: vi.fn(),
    revalidateContentPages: vi.fn(),
    redirect: vi.fn((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    }),
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/content/delete-catalog-subject", () => ({
  CatalogSubjectDeletionError: mocks.CatalogSubjectDeletionError,
  deleteCatalogSubject: mocks.deleteCatalogSubject,
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
}));

import { deleteAdminSubjectAction } from "@/modules/content/actions/admin-subject-delete-actions";

function deletionForm(name = "Matemáticas") {
  const formData = new FormData();
  formData.set("subjectId", "subject-1");
  formData.set("confirmationName", name);
  return formData;
}

describe("deleteAdminSubjectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    mocks.deleteCatalogSubject.mockResolvedValue({ levelId: "level-1" });
  });

  it("revalidates content and returns to the parent level", async () => {
    await expect(
      deleteAdminSubjectAction({ status: "idle" }, deletionForm()),
    ).rejects.toThrow(
      "REDIRECT:/dashboard/admin/content/levels/level-1",
    );

    expect(mocks.deleteCatalogSubject).toHaveBeenCalledWith(
      { subjectId: "subject-1", confirmationName: "Matemáticas" },
      { id: "admin-1", role: Role.ADMIN },
    );
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
  });

  it("returns a name mismatch beside the confirmation field", async () => {
    mocks.deleteCatalogSubject.mockRejectedValueOnce(
      new mocks.CatalogSubjectDeletionError(
        "NAME_MISMATCH",
        "El nombre de confirmación no coincide.",
      ),
    );

    await expect(
      deleteAdminSubjectAction({ status: "idle" }, deletionForm()),
    ).resolves.toEqual({
      status: "error",
      message: "El nombre de confirmación no coincide.",
      fieldErrors: {
        confirmationName: ["El nombre de confirmación no coincide."],
      },
    });
  });

  it("rejects an empty confirmation before authorization", async () => {
    await expect(
      deleteAdminSubjectAction({ status: "idle" }, deletionForm("")),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.requireRole).not.toHaveBeenCalled();
    expect(mocks.deleteCatalogSubject).not.toHaveBeenCalled();
  });
});
