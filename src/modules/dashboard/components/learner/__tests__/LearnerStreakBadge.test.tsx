import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LearnerStreakBadge } from "@/modules/dashboard/components/learner/LearnerStreakBadge";

describe("LearnerStreakBadge", () => {
  it("shows the real day count and the next visual milestone", () => {
    const html = renderToStaticMarkup(<LearnerStreakBadge days={6} />);

    expect(html).toContain("6 días");
    expect(html).toContain("Nuevo color en 4 días");
    expect(html).toContain("bg-amber-400/15");
  });

  it("celebrates the highest color level without promising another color", () => {
    const html = renderToStaticMarkup(
      <LearnerStreakBadge days={20} tone="light" />,
    );

    expect(html).toContain("¡Racha legendaria!");
    expect(html).toContain("bg-violet-50");
    expect(html).not.toContain("Nuevo color");
  });
});
