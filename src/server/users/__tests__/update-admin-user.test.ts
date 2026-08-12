import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const tx = {
  user: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
  level: {
    findUnique: vi.fn(),
  },
  session: {
    deleteMany: vi.fn(),
  },
};

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { updateAdminUser } from "@/server/users/update-admin-user";

const expectedUpdatedAt = new Date("2026-08-07T12:00:00.000Z");
const baseInput = {
  id: "user-1",
  expectedUpdatedAt,
  name: "Ana Actualizada",
  role: Role.TEACHER,
  selectedLevelId: "level-7",
};
const actor = { id: "admin-1", role: Role.ADMIN };

describe("updateAdminUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    tx.user.findUnique.mockResolvedValue({
      id: "user-1",
      role: Role.TEACHER,
      selectedLevelId: "level-7",
    });
    tx.level.findUnique.mockResolvedValue({ isActive: true });
    tx.user.updateMany.mockResolvedValue({ count: 1 });
    tx.session.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("updates safe profile fields without revoking unchanged sessions", async () => {
    await expect(updateAdminUser(baseInput, actor)).resolves.toEqual({
      id: "user-1",
      roleChanged: false,
    });

    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", updatedAt: expectedUpdatedAt },
      data: {
        name: "Ana Actualizada",
        role: Role.TEACHER,
        selectedLevelId: "level-7",
      },
    });
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });

  it("clears the level and revokes sessions after a role change", async () => {
    await updateAdminUser(
      { ...baseInput, role: Role.COLLABORATOR, selectedLevelId: null },
      actor,
    );

    expect(tx.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: Role.COLLABORATOR,
          selectedLevelId: null,
        }),
      }),
    );
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("prevents an administrator from changing their own role", async () => {
    tx.user.findUnique.mockResolvedValue({
      id: "admin-1",
      role: Role.ADMIN,
      selectedLevelId: null,
    });

    await expect(
      updateAdminUser(
        { ...baseInput, id: "admin-1", role: Role.TEACHER },
        actor,
      ),
    ).rejects.toMatchObject({
      code: "SELF_ROLE_CHANGE",
    });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });

  it("prevents degrading any existing administrator", async () => {
    tx.user.findUnique.mockResolvedValue({
      id: "admin-2",
      role: Role.ADMIN,
      selectedLevelId: null,
    });

    await expect(
      updateAdminUser(
        { ...baseInput, id: "admin-2", role: Role.COLLABORATOR },
        actor,
      ),
    ).rejects.toMatchObject({
      code: "ADMIN_ROLE_PROTECTED",
    });
  });

  it("prevents promoting a user to administrator without an audited flow", async () => {
    await expect(
      updateAdminUser({ ...baseInput, role: Role.ADMIN }, actor),
    ).rejects.toMatchObject({ code: "ADMIN_ROLE_PROTECTED" });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
  });

  it("rejects selecting a missing or inactive new level", async () => {
    tx.level.findUnique.mockResolvedValue(null);

    await expect(updateAdminUser(baseInput, actor)).rejects.toMatchObject({
      code: "INVALID_LEVEL",
    });
  });

  it("detects concurrent edits", async () => {
    tx.user.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateAdminUser(baseInput, actor)).rejects.toMatchObject({
      code: "EDIT_CONFLICT",
    });
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });
});
