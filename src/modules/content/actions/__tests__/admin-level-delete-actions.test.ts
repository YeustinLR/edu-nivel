import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => {
  class CatalogLevelDeletionError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
    }
  }

  return {
    CatalogLevelDeletionError,
    deleteCatalogLevel: vi.fn(),
    requireRole: vi.fn(),
    revalidateContentPages: vi.fn(),
    redirect: vi.fn((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    }),
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/content/delete-catalog-level", () => ({
  CatalogLevelDeletionError: mocks.CatalogLevelDeletionError,
  deleteCatalogLevel: mocks.deleteCatalogLevel,
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
}));

import { deleteAdminLevelAction } from "@/modules/content/actions/admin-level-delete-actions";

function deletionForm(label = "Nivel 7") {
  const formData = new FormData();
  formData.set("levelId", "level-7");
  formData.set("confirmationLabel", label);
  return formData;
}

describe("deleteAdminLevelAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    mocks.deleteCatalogLevel.mockResolvedValue(undefined);
  });

  it("deletes the level, refreshes published views and returns to the catalog", async () => {
    await expect(
      deleteAdminLevelAction({ status: "idle" }, deletionForm()),
    ).rejects.toThrow(
      "REDIRECT:/dashboard/admin/content/catalog",
    );

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.ADMIN);
    expect(mocks.deleteCatalogLevel).toHaveBeenCalledWith(
      { levelId: "level-7", confirmationLabel: "Nivel 7" },
      { id: "admin-1", role: Role.ADMIN },
    );
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
  });

  it("shows a mismatched confirmation beside its field", async () => {
    mocks.deleteCatalogLevel.mockRejectedValueOnce(
      new mocks.CatalogLevelDeletionError(
        "LABEL_MISMATCH",
        "El nombre de confirmación no coincide.",
      ),
    );

    await expect(
      deleteAdminLevelAction({ status: "idle" }, deletionForm("Nivel 8")),
    ).resolves.toEqual({
      status: "error",
      message: "El nombre de confirmación no coincide.",
      fieldErrors: {
        confirmationLabel: ["El nombre de confirmación no coincide."],
      },
    });
    expect(mocks.revalidateContentPages).not.toHaveBeenCalled();
  });

  it("returns a dependency error without redirecting", async () => {
    mocks.deleteCatalogLevel.mockRejectedValueOnce(
      new mocks.CatalogLevelDeletionError(
        "DEPENDENCY_BLOCKED",
        "No puedes eliminar el nivel mientras tenga suscripciones vigentes o pagos pendientes.",
      ),
    );

    await expect(
      deleteAdminLevelAction({ status: "idle" }, deletionForm()),
    ).resolves.toEqual({
      status: "error",
      message:
        "No puedes eliminar el nivel mientras tenga suscripciones vigentes o pagos pendientes.",
      fieldErrors: undefined,
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("rejects an empty confirmation before checking authorization", async () => {
    const result = await deleteAdminLevelAction(
      { status: "idle" },
      deletionForm(""),
    );

    expect(result.status).toBe("error");
    expect(mocks.requireRole).not.toHaveBeenCalled();
    expect(mocks.deleteCatalogLevel).not.toHaveBeenCalled();
  });
});
