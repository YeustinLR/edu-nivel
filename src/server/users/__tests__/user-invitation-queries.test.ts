import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: { userInvitation: { findUnique: mocks.findUnique } },
}));

import { getUserInvitationAcceptanceData } from "@/server/users/user-invitation-queries";

describe("getUserInvitationAcceptanceData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed tokens without querying the database", async () => {
    await expect(getUserInvitationAcceptanceData("short")).resolves.toEqual({
      status: "invalid",
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("returns only safe acceptance data for a pending invitation", async () => {
    mocks.findUnique.mockResolvedValue({
      name: "Ana",
      email: "ana@example.com",
      activeEmail: "ana@example.com",
      role: Role.TEACHER,
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
      canceledAt: null,
      selectedLevel: { levelNumber: 7 },
    });

    await expect(
      getUserInvitationAcceptanceData("a".repeat(43)),
    ).resolves.toMatchObject({
      status: "pending",
      email: "ana@example.com",
      role: Role.TEACHER,
      levelNumber: 7,
    });
  });

  it("distinguishes used and expired links", async () => {
    mocks.findUnique.mockResolvedValueOnce({
      activeEmail: null,
      acceptedAt: new Date(),
      canceledAt: null,
    });
    await expect(
      getUserInvitationAcceptanceData("a".repeat(43)),
    ).resolves.toEqual({ status: "used" });

    mocks.findUnique.mockResolvedValueOnce({
      activeEmail: "ana@example.com",
      acceptedAt: null,
      canceledAt: null,
      expiresAt: new Date(0),
    });
    await expect(
      getUserInvitationAcceptanceData("b".repeat(43)),
    ).resolves.toEqual({ status: "expired" });
  });
});
