import { describe, expect, it } from "vitest";

import { editorialActionSchema } from "@/modules/content/schemas/editorial-action.schema";

const baseInput = {
  targetType: "module",
  targetId: "module-1",
  parentId: "subject-1",
  reviewConfirmed: false,
} as const;

describe("editorialActionSchema", () => {
  it("requires an explicit review confirmation to publish", () => {
    expect(
      editorialActionSchema.safeParse({
        ...baseInput,
        transition: "PUBLISH",
      }).success,
    ).toBe(false);

    expect(
      editorialActionSchema.safeParse({
        ...baseInput,
        transition: "PUBLISH",
        reviewConfirmed: "true",
      }).success,
    ).toBe(true);
  });

  it("requires a useful observation when requesting changes", () => {
    expect(
      editorialActionSchema.safeParse({
        ...baseInput,
        transition: "REQUEST_CHANGES",
        reviewNote: "No",
      }).success,
    ).toBe(false);

    expect(
      editorialActionSchema.safeParse({
        ...baseInput,
        transition: "REQUEST_CHANGES",
        reviewNote: "Completa el texto alternativo de la imagen.",
      }).success,
    ).toBe(true);
  });

  it("limits editorial observations to 500 characters", () => {
    expect(
      editorialActionSchema.safeParse({
        ...baseInput,
        transition: "REQUEST_CHANGES",
        reviewNote: "a".repeat(500),
      }).success,
    ).toBe(true);

    expect(
      editorialActionSchema.safeParse({
        ...baseInput,
        transition: "REQUEST_CHANGES",
        reviewNote: "a".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("does not require publication confirmation for other transitions", () => {
    expect(
      editorialActionSchema.safeParse({
        ...baseInput,
        transition: "SUBMIT_FOR_REVIEW",
      }).success,
    ).toBe(true);
  });
});
