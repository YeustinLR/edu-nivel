import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));

import {
  ACTIVE_ACADEMIC_LEVELS_TAG,
  STUDENT_ACADEMIC_CATALOG_TAG,
  TEACHER_ACADEMIC_CATALOG_TAG,
} from "@/server/content/academic-catalog-cache";

import {
  revalidateContentPages,
  revalidateLearnerSelectionPages,
} from "@/server/content/revalidate-content";

describe("content revalidation boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps draft and review mutations inside authoring surfaces", () => {
    revalidateContentPages("authoring");

    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/dashboard/admin/content", "layout"],
      ["/dashboard/collaborator/content", "layout"],
    ]);
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("adds exact learner pages when published content changes", () => {
    revalidateContentPages("published");

    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/dashboard/admin/content", "layout"],
      ["/dashboard/collaborator/content", "layout"],
      ["/dashboard/student"],
      ["/dashboard/student/content"],
      ["/dashboard/student/explore"],
      ["/dashboard/teacher"],
      ["/dashboard/teacher/content"],
      ["/dashboard/teacher/explore"],
    ]);
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith(
      "/dashboard/student",
      "layout",
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith(
      "/dashboard/teacher",
      "layout",
    );
    expect(mocks.updateTag.mock.calls).toEqual([
      [ACTIVE_ACADEMIC_LEVELS_TAG],
      [STUDENT_ACADEMIC_CATALOG_TAG],
      [TEACHER_ACADEMIC_CATALOG_TAG],
    ]);
  });

  it.each([
    [Role.STUDENT, "/dashboard/student"],
    [Role.TEACHER, "/dashboard/teacher"],
  ])("isolates %s level selection to its own learner shell", (role, path) => {
    revalidateLearnerSelectionPages(role);

    expect(mocks.revalidatePath.mock.calls).toEqual([
      [path, "layout"],
      ["/dashboard/subscription"],
    ]);
  });
});
