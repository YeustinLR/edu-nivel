import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma/enums";
import {
  buildAdminUsersHref,
  parseAdminUsersSearchParams,
} from "@/modules/users/schemas/admin-users.schema";

describe("admin users search params", () => {
  it("normalizes supported filters", () => {
    expect(
      parseAdminUsersSearchParams({
        q: "  ana@example.com  ",
        role: Role.TEACHER,
        verification: "verified",
        sort: "name",
        page: "3",
      }),
    ).toEqual({
      query: "ana@example.com",
      role: Role.TEACHER,
      verification: "verified",
      sort: "name",
      page: 3,
    });
  });

  it("falls back safely for invalid or repeated values", () => {
    expect(
      parseAdminUsersSearchParams({
        q: ["ana", "otro"],
        role: "OWNER",
        verification: "all",
        sort: "email",
        page: "-2",
      }),
    ).toEqual({
      query: "",
      role: undefined,
      verification: undefined,
      sort: "newest",
      page: 1,
    });
  });

  it("builds a canonical URL without default parameters", () => {
    expect(
      buildAdminUsersHref({
        query: "maria",
        role: Role.COLLABORATOR,
        verification: "unverified",
        sort: "newest",
        page: 1,
      }),
    ).toBe(
      "/dashboard/admin/users?q=maria&role=COLLABORATOR&verification=unverified",
    );
  });
});
