import { describe, expect, it } from "vitest";

import {
  createLevelSchema,
  createModuleSchema,
  createSubjectSchema,
  parseAdminContentCreationSearchParams,
  withAdminContentCreationMode,
} from "@/modules/content/schemas/admin-content-creation.schema";

describe("admin content creation schemas", () => {
  it("normalizes valid creation inputs", () => {
    expect(
      createLevelSchema.parse({
        levelNumber: "7",
        description: "  Sétimo año  ",
        requiresSubscription: true,
      }),
    ).toEqual({
      levelNumber: 7,
      description: "Sétimo año",
      requiresSubscription: true,
    });

    expect(
      createSubjectSchema.parse({
        levelId: "level-1",
        name: "  Matemáticas  ",
        description: "",
      }),
    ).toEqual({
      levelId: "level-1",
      name: "Matemáticas",
      description: undefined,
    });

    expect(
      createModuleSchema.parse({
        subjectId: "subject-1",
        title: "  Fracciones  ",
        description: "",
        audience: "STUDENT",
        disposition: "PUBLISH",
      }),
    ).toEqual({
      subjectId: "subject-1",
      title: "Fracciones",
      description: undefined,
      audience: "STUDENT",
      disposition: "PUBLISH",
    });
  });

  it("rejects invalid required fields and enum values", () => {
    expect(
      createLevelSchema.safeParse({
        levelNumber: "0",
        description: "",
        requiresSubscription: false,
      }).success,
    ).toBe(false);
    expect(
      createSubjectSchema.safeParse({
        levelId: "",
        name: "M",
        description: "",
      }).success,
    ).toBe(false);
    expect(
      createModuleSchema.safeParse({
        subjectId: "subject-1",
        title: "Módulo",
        description: "",
        audience: "UNKNOWN",
        disposition: "PUBLISH",
      }).success,
    ).toBe(false);
  });

  it("accepts only supported dialog modes", () => {
    expect(parseAdminContentCreationSearchParams({ create: "module" })).toBe(
      "module",
    );
    expect(
      parseAdminContentCreationSearchParams({ create: "resource" }),
    ).toBe("resource");
    expect(
      parseAdminContentCreationSearchParams({ create: ["level"] }),
    ).toBeUndefined();
  });

  it("adds the creation mode without losing existing URL state", () => {
    expect(
      withAdminContentCreationMode(
        "/dashboard/admin/content?tab=catalogo&levelId=level-1",
        "subject",
      ),
    ).toBe(
      "/dashboard/admin/content?tab=catalogo&levelId=level-1&create=subject",
    );
  });
});
