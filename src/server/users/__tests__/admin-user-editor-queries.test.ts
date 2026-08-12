import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  userFindUnique: vi.fn(),
  levelFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    level: { findMany: mocks.levelFindMany },
  },
}));

import { getAdminUserEditorContext } from "@/server/users/admin-user-editor-queries";

describe("getAdminUserEditorContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
  });

  it("requires ADMIN before loading form data", async () => {
    mocks.requireRole.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(getAdminUserEditorContext("user-1")).rejects.toThrow("FORBIDDEN");
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("does not query levels for an unknown user", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    await expect(getAdminUserEditorContext("missing")).resolves.toEqual({
      user: null,
      levels: [],
    });
    expect(mocks.levelFindMany).not.toHaveBeenCalled();
  });

  it("includes active levels and the currently selected level", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      name: "Ana",
      email: "ana@example.com",
      role: Role.STUDENT,
      selectedLevelId: "level-old",
      updatedAt: new Date("2026-08-07T12:00:00.000Z"),
    });
    mocks.levelFindMany.mockResolvedValue([]);

    await getAdminUserEditorContext("user-1");

    expect(mocks.levelFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ isActive: true }, { id: "level-old" }] },
      }),
    );
  });
});
