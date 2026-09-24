import { describe, expect, it } from "vitest";

import {
  canOpenLearnerResource,
  getLearnerResourceAccessMode,
} from "@/modules/content/domain/learner-resource-access";

describe("learner resource access", () => {
  it.each([
    [false, false, false, "INCLUDED"],
    [true, false, true, "SUBSCRIBED"],
    [true, true, false, "FREE_PREVIEW"],
    [true, false, false, "LOCKED"],
  ] as const)(
    "maps level subscription=%s preview=%s full access=%s to %s",
    (levelRequiresSubscription, isFreePreview, hasLevelAccess, expected) => {
      const mode = getLearnerResourceAccessMode({
        levelRequiresSubscription,
        isFreePreview,
        hasLevelAccess,
      });

      expect(mode).toBe(expected);
      expect(canOpenLearnerResource(mode)).toBe(expected !== "LOCKED");
    },
  );

  it("does not let a preview flag override a subscribed access mode", () => {
    expect(
      getLearnerResourceAccessMode({
        levelRequiresSubscription: true,
        isFreePreview: true,
        hasLevelAccess: true,
      }),
    ).toBe("SUBSCRIBED");
  });
});
