import { describe, expect, it } from "vitest";

import { adminUserInvitationOperationSchema } from "@/modules/users/schemas/admin-user-invitation-operation.schema";

describe("adminUserInvitationOperationSchema", () => {
  it.each(["resend", "cancel"])("accepts %s", (operation) => {
    expect(
      adminUserInvitationOperationSchema.safeParse({
        invitationId: "invitation-1",
        operation,
      }).success,
    ).toBe(true);
  });

  it("rejects unknown operations and empty identifiers", () => {
    expect(
      adminUserInvitationOperationSchema.safeParse({
        invitationId: "",
        operation: "delete",
      }).success,
    ).toBe(false);
  });
});
