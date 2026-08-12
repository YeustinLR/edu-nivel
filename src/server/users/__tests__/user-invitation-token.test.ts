import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  generateUserInvitationToken,
  getUserInvitationExpiration,
  hashUserInvitationToken,
} from "@/server/users/user-invitation-token";

describe("user invitation tokens", () => {
  it("generates high-entropy URL-safe tokens and stores a deterministic hash", () => {
    const token = generateUserInvitationToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashUserInvitationToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashUserInvitationToken(token)).not.toContain(token);
  });

  it("expires invitations after 72 hours", () => {
    const now = new Date("2026-08-08T00:00:00.000Z");
    expect(getUserInvitationExpiration(now).toISOString()).toBe(
      "2026-08-11T00:00:00.000Z",
    );
  });
});
