import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => {
  class CatalogResourceDeletionError extends Error {
    constructor(
      public readonly code: string,
      message: string,
    ) {
      super(message);
    }
  }

  return {
    CatalogResourceDeletionError,
    deleteCatalogResource: vi.fn(),
    requireRole: vi.fn(),
    revalidateContentPages: vi.fn(),
    redirect: vi.fn((href: string) => {
      throw new Error(`REDIRECT:${href}`);
    }),
  };
});

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/content/delete-catalog-resource", () => ({
  CatalogResourceDeletionError: mocks.CatalogResourceDeletionError,
  deleteCatalogResource: mocks.deleteCatalogResource,
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidateContentPages: mocks.revalidateContentPages,
}));

import { deleteAdminResourceAction } from "@/modules/content/actions/admin-resource-delete-actions";

function deletionForm(title = "Guía de números naturales") {
  const formData = new FormData();
  formData.set("resourceId", "resource-1");
  formData.set("confirmationTitle", title);
  return formData;
}

describe("deleteAdminResourceAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    mocks.deleteCatalogResource.mockResolvedValue({ moduleId: "module-1" });
  });

  it("revalidates content and returns to the parent module", async () => {
    await expect(
      deleteAdminResourceAction({ status: "idle" }, deletionForm()),
    ).rejects.toThrow("REDIRECT:/dashboard/admin/content/modules/module-1");

    expect(mocks.deleteCatalogResource).toHaveBeenCalledWith(
      {
        resourceId: "resource-1",
        confirmationTitle: "Guía de números naturales",
      },
      { id: "admin-1", role: Role.ADMIN },
    );
    expect(mocks.revalidateContentPages).toHaveBeenCalledWith("published");
  });

  it("returns a title mismatch beside the confirmation field", async () => {
    mocks.deleteCatalogResource.mockRejectedValueOnce(
      new mocks.CatalogResourceDeletionError(
        "TITLE_MISMATCH",
        "El título de confirmación no coincide.",
      ),
    );

    await expect(
      deleteAdminResourceAction({ status: "idle" }, deletionForm()),
    ).resolves.toEqual({
      status: "error",
      message: "El título de confirmación no coincide.",
      fieldErrors: {
        confirmationTitle: ["El título de confirmación no coincide."],
      },
    });
  });

  it("rejects an empty confirmation before authorization", async () => {
    await expect(
      deleteAdminResourceAction({ status: "idle" }, deletionForm("")),
    ).resolves.toMatchObject({ status: "error" });
    expect(mocks.requireRole).not.toHaveBeenCalled();
    expect(mocks.deleteCatalogResource).not.toHaveBeenCalled();
  });
});
