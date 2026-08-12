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

  it("never sends modules to review", () => {
    for (const status of Object.values(PublicationStatus)) {
      expect(
        getCollaboratorEditorialTransitions("module", status),
      ).not.toContain("SUBMIT_FOR_REVIEW");
      expect(getAdminEditorialTransitions("module", status)).not.toContain(
        "PUBLISH",
      );
      expect(
        isEditorialTransitionAllowed(
          "module",
          status,
          "SUBMIT_FOR_REVIEW",
        ),
      ).toBe(false);
    }
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
    ).toEqual(["PUBLISH_DIRECT"]);
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
