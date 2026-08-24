import { describe, expect, it } from "vitest";

import { isStudentExploreHref } from "@/modules/content/domain/student-explore-navigation";

describe("student explore navigation", () => {
  it("recognizes only Student Explore destinations", () => {
    expect(
      isStudentExploreHref(
        "/dashboard/student/explore?stage=primary&level=level-1",
      ),
    ).toBe(true);
    expect(isStudentExploreHref("/dashboard/student/content")).toBe(false);
    expect(isStudentExploreHref("/dashboard/teacher/explore?level=level-1")).toBe(false);
  });
});
