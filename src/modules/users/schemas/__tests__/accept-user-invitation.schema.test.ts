import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { acceptUserInvitationSchema } from "@/modules/users/schemas/accept-user-invitation.schema";

const validInput = {
  invitationToken: "a".repeat(43),
  name: "Ana Invitada",
  email: "ana@example.com",
  role: Role.COLLABORATOR,
  ageDeclared: 28,
  password: "Segura9!alfabeto",
  confirmPassword: "Segura9!alfabeto",
  acceptTerms: true,
  acceptPrivacy: true,
  adultDeclaration: true,
};

describe("acceptUserInvitationSchema", () => {
  it("accepts a complete invited collaborator registration", () => {
    expect(acceptUserInvitationSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects an invalid token and missing consent", () => {
    const result = acceptUserInvitationSchema.safeParse({
      ...validInput,
      invitationToken: "short",
      acceptTerms: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        invitationToken: expect.any(Array),
        acceptTerms: expect.any(Array),
      });
    }
  });

  it("applies the shared password and adult-age rules", () => {
    expect(
      acceptUserInvitationSchema.safeParse({
        ...validInput,
        ageDeclared: 17,
        password: "weak",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
  });
});
