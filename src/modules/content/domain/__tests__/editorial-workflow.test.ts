import { describe, expect, it } from "vitest";

import { PublicationStatus } from "@/generated/prisma/enums";
import {
  editorialTransitions,
  getAdminEditorialTransitions,
  getAdminReviewTransitions,
  getCollaboratorEditorialTransitions,
  getEditorialTransitionTarget,
  isEditorialTransitionAllowed,
} from "@/modules/content/domain/editorial-workflow";

describe("editorial workflow", () => {
  it.each([
    ["module", PublicationStatus.DRAFT, "PUBLISH_DIRECT"],
    ["module", PublicationStatus.DRAFT, "SUBMIT_FOR_REVIEW"],
    ["module", PublicationStatus.IN_REVIEW, "PUBLISH"],
    ["module", PublicationStatus.PUBLISHED, "UNPUBLISH"],
    ["resource", PublicationStatus.DRAFT, "SUBMIT_FOR_REVIEW"],
    ["resource", PublicationStatus.DRAFT, "PUBLISH_DIRECT"],
    ["resource", PublicationStatus.IN_REVIEW, "WITHDRAW_REVIEW"],
    ["resource", PublicationStatus.IN_REVIEW, "PUBLISH"],
    ["resource", PublicationStatus.IN_REVIEW, "REQUEST_CHANGES"],
    ["resource", PublicationStatus.PUBLISHED, "UNPUBLISH"],
  ] as const)("allows %s in %s -> %s", (type, status, transition) => {
    expect(isEditorialTransitionAllowed(type, status, transition)).toBe(true);
  });

  it("sends collaborator modules through review", () => {
    expect(getCollaboratorEditorialTransitions("module", PublicationStatus.DRAFT)).toEqual(["SUBMIT_FOR_REVIEW"]);
    expect(getAdminEditorialTransitions("module", PublicationStatus.IN_REVIEW)).toContain("PUBLISH");
  });

  it("exposes direct publication to admins and resource review to collaborators", () => {
    expect(
      getAdminEditorialTransitions("resource", PublicationStatus.DRAFT),
    ).toEqual(["PUBLISH_DIRECT"]);
    expect(
      getCollaboratorEditorialTransitions("resource", PublicationStatus.DRAFT),
    ).toEqual(["SUBMIT_FOR_REVIEW"]);
    expect(
      getCollaboratorEditorialTransitions("module", PublicationStatus.DRAFT),
    ).toEqual(["SUBMIT_FOR_REVIEW"]);
  });

  it("maps direct and reviewed publication to PUBLISHED", () => {
    expect(getEditorialTransitionTarget("module", "PUBLISH_DIRECT")).toBe(
      PublicationStatus.PUBLISHED,
    );
    expect(getEditorialTransitionTarget("resource", "PUBLISH")).toBe(
      PublicationStatus.PUBLISHED,
    );
  });

  it("keeps the review inbox limited to review decisions", () => {
    expect(getAdminReviewTransitions(PublicationStatus.IN_REVIEW)).toEqual([
      "PUBLISH",
      "REQUEST_CHANGES",
    ]);
    expect(getAdminReviewTransitions(PublicationStatus.DRAFT)).toEqual([]);
  });

  it("declares a rule for every transition and target type", () => {
    for (const transition of editorialTransitions) {
      expect(() =>
        getEditorialTransitionTarget("module", transition),
      ).not.toThrow();
      expect(() =>
        getEditorialTransitionTarget("resource", transition),
      ).not.toThrow();
    }
  });
});
