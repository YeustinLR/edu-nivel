import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findFirst: vi.fn(),
  createUserInvitation: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    userInvitation: {
      updateMany: mocks.updateMany,
      findFirst: mocks.findFirst,
    },
  },
}));
vi.mock("@/server/users/create-user-invitation", () => ({
  createUserInvitation: mocks.createUserInvitation,
}));

import { manageUserInvitation } from "@/server/users/manage-user-invitation";

const actor = { id: "admin-1", name: "Administrador", role: Role.ADMIN };

describe("manageUserInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.createUserInvitation.mockResolvedValue({ id: "invitation-new" });
  });

  it("cancels only a still-pending invitation", async () => {
    await expect(
      manageUserInvitation(
        { invitationId: "invitation-1", operation: "cancel" },
        actor,
      ),
    ).resolves.toEqual({ operation: "cancel" });

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invitation-1",
        activeEmail: { not: null },
        acceptedAt: null,
        canceledAt: null,
      },
      data: { activeEmail: null, canceledAt: expect.any(Date) },
    });
  });

  it("rejects canceling an invitation that is no longer pending", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      manageUserInvitation(
        { invitationId: "invitation-1", operation: "cancel" },
        actor,
      ),
    ).rejects.toThrow("ya no está pendiente");
  });

  it("resends by creating a rotated invitation from safe stored data", async () => {
    mocks.findFirst.mockResolvedValue({
      name: "Ana",
      email: "ana@example.com",
      role: Role.TEACHER,
      selectedLevelId: "level-7",
    });

    await expect(
      manageUserInvitation(
        { invitationId: "invitation-1", operation: "resend" },
        actor,
      ),
    ).resolves.toEqual({ operation: "resend" });

    expect(mocks.createUserInvitation).toHaveBeenCalledWith(
      {
        name: "Ana",
        email: "ana@example.com",
        role: Role.TEACHER,
        selectedLevelId: "level-7",
      },
      actor,
    );
  });

  it("does not resend unavailable or administrator invitations", async () => {
    mocks.findFirst.mockResolvedValue({
      name: "Admin",
      email: "admin@example.com",
      role: Role.ADMIN,
      selectedLevelId: null,
    });

    await expect(
      manageUserInvitation(
        { invitationId: "invitation-1", operation: "resend" },
        actor,
      ),
    ).rejects.toThrow("no está disponible");
    expect(mocks.createUserInvitation).not.toHaveBeenCalled();
  });
});
