"use server";

import { revalidatePath } from "next/cache";

import { Role } from "@/generated/prisma/enums";
import type { ActiveQuizAttempt, QuizAttemptResult } from "@/modules/content/domain/quiz";
import { getPremiumAccessDecision, requireRole, AuthGuardError } from "@/server/auth/guards";
import {
  QuizAttemptError,
  startOrResumeStudentQuizAttempt,
  submitStudentQuizAttempt,
} from "@/server/content/quiz-attempts";

export type StudentQuizActionResult<T> =
  | { status: "success"; data: T }
  | { status: "error"; message: string };

async function getAuthorizedStudent() {
  const user = await requireRole(Role.STUDENT);
  const access = await getPremiumAccessDecision(user.selectedLevelId);
  if (!access.decision.allowed) {
    throw new AuthGuardError(
      "FORBIDDEN",
      "No tienes acceso al nivel donde está este cuestionario.",
    );
  }
  return user;
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
    const user = await getAuthorizedStudent();
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
    const user = await getAuthorizedStudent();
    const result = await submitStudentQuizAttempt(
      { id: user.id, selectedLevelId: user.selectedLevelId },
      attemptId,
      answers,
    );
    revalidatePath("/dashboard/student/content");
    return { status: "success", data: result };
  } catch (error) {
    return actionError(error);
  }
}
