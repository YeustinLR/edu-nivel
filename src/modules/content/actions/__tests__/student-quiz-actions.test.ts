import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";
import { startStudentQuizAttemptAction, submitStudentQuizAttemptAction } from "@/modules/content/actions/student-quiz-actions";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getAuthorizedStudentResource: vi.fn(),
  attemptFindFirst: vi.fn(),
  start: vi.fn(),
  submit: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/server/auth/guards", () => ({
  AuthGuardError: class AuthGuardError extends Error {},
  requireRole: mocks.requireRole,
}));
vi.mock("@/server/content/quiz-attempts", () => ({
  QuizAttemptError: class QuizAttemptError extends Error {},
  startOrResumeStudentQuizAttempt: mocks.start,
  submitStudentQuizAttempt: mocks.submit,
}));
vi.mock("@/server/content/student-resource-access", () => ({
  getAuthorizedStudentResource: mocks.getAuthorizedStudentResource,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    quizAttempt: { findFirst: mocks.attemptFindFirst },
  },
}));

describe("student quiz actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      selectedLevelId: "level-1",
    });
    mocks.getAuthorizedStudentResource.mockResolvedValue({
      allowed: true,
      userId: "student-1",
      levelId: "level-1",
      resourceId: "resource-1",
      accessMode: "SUBSCRIBED",
    });
    mocks.attemptFindFirst.mockResolvedValue({
      quiz: { resourceId: "resource-1" },
    });
    mocks.start.mockResolvedValue({ attemptId: "attempt-1", questions: [] });
    mocks.submit.mockResolvedValue({ attemptId: "attempt-1", percentage: 100 });
  });

  it("requires resource-level access before starting", async () => {
    const result = await startStudentQuizAttemptAction("resource-1");

    expect(mocks.getAuthorizedStudentResource).toHaveBeenCalledWith("resource-1");
    expect(mocks.start).toHaveBeenCalledWith(
      { id: "student-1", selectedLevelId: "level-1" },
      "resource-1",
    );
    expect(result.status).toBe("success");
  });

  it("refuses to reveal a quiz without resource access", async () => {
    mocks.getAuthorizedStudentResource.mockResolvedValue({
      allowed: false,
      code: "CONTENT_ACCESS_REQUIRED",
    });

    const result = await startStudentQuizAttemptAction("resource-1");

    expect(result).toMatchObject({ status: "error" });
    expect(mocks.start).not.toHaveBeenCalled();
  });

  it("sends only the submitted selections to the grading service", async () => {
    const answers = [
      {
        questionId: "10000000-0000-4000-8000-000000000001",
        optionId: "20000000-0000-4000-8000-000000000002",
      },
    ];

    const result = await submitStudentQuizAttemptAction("attempt-1", answers);

    expect(mocks.submit).toHaveBeenCalledWith(
      { id: "student-1", selectedLevelId: "level-1" },
      "attempt-1",
      answers,
    );
    expect(result).toMatchObject({ status: "success", data: { percentage: 100 } });
  });
});
