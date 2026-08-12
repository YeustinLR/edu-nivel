import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { adminUserInvitationSchema } from "@/modules/users/schemas/admin-user-invitation.schema";

describe("adminUserInvitationSchema", () => {
  it("normalizes the email and accepts learner invitations", () => {
    expect(
      adminUserInvitationSchema.parse({
        name: "  Ana Estudiante  ",
        email: "  ANA@Example.com ",
        role: Role.STUDENT,
        selectedLevelId: "level-7",
      }),
    ).toEqual({
      name: "Ana Estudiante",
      email: "ana@example.com",
      role: Role.STUDENT,
      selectedLevelId: "level-7",
    });
  });

  it("accepts collaborators without a level", () => {
    expect(
      adminUserInvitationSchema.safeParse({
        name: "Colaborador",
        email: "colaborador@example.com",
        role: Role.COLLABORATOR,
        selectedLevelId: "",
      }).success,
    ).toBe(true);
  });

  it("rejects ADMIN and collaborator level assignments", () => {
    expect(
      adminUserInvitationSchema.safeParse({
        name: "Admin",
        email: "admin@example.com",
        role: Role.ADMIN,
        selectedLevelId: "",
      }).success,
    ).toBe(false);

    const collaborator = adminUserInvitationSchema.safeParse({
      name: "Colaborador",
      email: "colaborador@example.com",
      role: Role.COLLABORATOR,
      selectedLevelId: "level-1",
    });
    expect(collaborator.success).toBe(false);
  });
});
