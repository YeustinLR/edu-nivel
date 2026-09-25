import { describe, expect, it } from "vitest";

import { profileNameSchema } from "@/modules/account/schemas/profile-name.schema";

describe("profileNameSchema", () => {
  it("normaliza espacios exteriores de un nombre válido", () => {
    expect(profileNameSchema.parse("  Ana Rodríguez  ")).toBe("Ana Rodríguez");
  });

  it("rechaza nombres demasiado cortos", () => {
    expect(profileNameSchema.safeParse(" A ").success).toBe(false);
  });

  it("rechaza nombres que superan el límite", () => {
    expect(profileNameSchema.safeParse("a".repeat(101)).success).toBe(false);
  });
});

