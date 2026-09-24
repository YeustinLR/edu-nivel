"use server";

import { revalidatePath } from "next/cache";

import { Role } from "@/generated/prisma/enums";
import type { ActiveQuizAttempt, QuizAttemptResult } from "@/modules/content/domain/quiz";
import { requireRole, AuthGuardError } from "@/server/auth/guards";
import {
  QuizAttemptError,
  startOrResumeStudentQuizAttempt,
  submitStudentQuizAttempt,
} from "@/server/content/quiz-attempts";
import { getAuthorizedStudentResource } from "@/server/content/student-resource-access";
import { prisma } from "@/server/db/prisma";

export type StudentQuizActionResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; message: string };

async function getAuthorizedStudent(resourceId: string) {
  const access = await getAuthorizedStudentResource(resourceId);
  if (!access.allowed) {
    throw new AuthGuardError(
      "FORBIDDEN",
      "No tienes acceso a este cuestionario.",
    );
  }
  return { id: access.userId, selectedLevelId: access.levelId };
}

function actionError(error: unknown): StudentQuizActionResult<never> {
  if (error instanceof AuthGuardError || error instanceof QuizAttemptError) {
    return { status: "error", message: error.message };
  }
  throw error;
}

export async function startStudentQuizAttemptAction(
  resourceId: string,
): Promise<StudentQuizActionResult<ActiveQuizAttempt>> {
  try {
    if (typeof resourceId !== "string" || resourceId.trim().length < 1 || resourceId.length > 128) {
      return { status: "error", message: "El cuestionario solicitado no es válido." };
    }
    const user = await getAuthorizedStudent(resourceId);
    const attempt = await startOrResumeStudentQuizAttempt(
      { id: user.id, selectedLevelId: user.selectedLevelId },
      resourceId,
    );
    revalidatePath("/dashboard/student/content");
    return { status: "success", data: attempt };
  } catch (error) {
    return actionError(error);
  }
}

export async function submitStudentQuizAttemptAction(
  attemptId: string,
  answers: unknown,
): Promise<StudentQuizActionResult<QuizAttemptResult>> {
  try {
    if (typeof attemptId !== "string" || attemptId.trim().length < 1 || attemptId.length > 128) {
      return { status: "error", message: "El intento solicitado no es válido." };
    }
    const user = await requireRole(Role.STUDENT);
    const attempt = await prisma.quizAttempt.findFirst({
      where: { id: attemptId, userId: user.id },
      select: { quiz: { select: { resourceId: true } } },
    });
    if (!attempt) {
      throw new QuizAttemptError(
        "ATTEMPT_NOT_FOUND",
        "No encontramos este intento de cuestionario.",
      );
    }
    const authorizedUser = await getAuthorizedStudent(attempt.quiz.resourceId);
    const result = await submitStudentQuizAttempt(
      authorizedUser,
      attemptId,
      answers,
    );
    revalidatePath("/dashboard/student/content");
    return { status: "success", data: result };
  } catch (error) {
    return actionError(error);
  }
}
