import { describe, expect, it } from "vitest";

import { ResourceType } from "@/generated/prisma/enums";
import {
  formatResourceDuration,
  formatLearnerLevel,
  resourceTone,
} from "@/modules/dashboard/domain/learner-presentation";

describe("learner presentation helpers", () => {
  it("formats known school levels and safely falls back for another level", () => {
    expect(formatLearnerLevel(7)).toBe("Séptimo año");
    expect(formatLearnerLevel(15)).toBe("Nivel 15");
  });

  it("uses real resource duration data when it exists", () => {
    expect(formatResourceDuration(null, 525)).toBe("8:45");
    expect(formatResourceDuration(12, null)).toBe("12 min");
    expect(formatResourceDuration(null, null)).toBeNull();
  });

  it("assigns a consistent visual tone by resource type", () => {
    expect(resourceTone(ResourceType.YOUTUBE)).toBe("blue");
    expect(resourceTone(ResourceType.PDF)).toBe("rose");
    expect(resourceTone(ResourceType.LESSON)).toBe("green");
  });
});
