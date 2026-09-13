import "server-only";

import { Prisma } from "@/generated/prisma/client";
import {
  QuizAttemptStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/enums";
import {
  gradeQuizAnswers,
  parseQuizSnapshot,
  quizAnswersSchema,
  quizQuestionsSchema,
  shuffleQuizQuestions,
  toLearnerQuizQuestions,
  type ActiveQuizAttempt,
  type QuizAnswer,
  type QuizAttemptResult,
} from "@/modules/content/domain/quiz";
import { getVisibleLearnerResourceTreeWhere } from "@/server/content/learner-content-access";
import { prisma } from "@/server/db/prisma";

export type QuizAttemptErrorCode =
  | "QUIZ_UNAVAILABLE"
  | "ATTEMPT_LIMIT_REACHED"
  | "INVALID_ANSWERS"
  | "ATTEMPT_NOT_FOUND";

export class QuizAttemptError extends Error {
  constructor(
    public readonly code: QuizAttemptErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "QuizAttemptError";
  }
}

export type StudentQuizActor = {
  id: string;
  selectedLevelId: string | null;
};

function unavailableQuiz() {
  return new QuizAttemptError(
    "QUIZ_UNAVAILABLE",
    "Este cuestionario ya no está disponible para responder.",
  );
}

function asActiveAttempt(attempt: {
  id: string;
  questionsSnapshot: Prisma.JsonValue;
  startedAt: Date;
}): ActiveQuizAttempt {
  const snapshot = parseQuizSnapshot(attempt.questionsSnapshot);
  if (!snapshot) throw unavailableQuiz();

  return {
    attemptId: attempt.id,
    passingScore: snapshot.passingScore,
    questions: toLearnerQuizQuestions(snapshot.questions),
    startedAt: attempt.startedAt.toISOString(),
  };
}

function asResult(attempt: {
  id: string;
  correctAnswers: number | null;
  questionCount: number;
  percentage: number | null;
  passed: boolean | null;
  questionsSnapshot: Prisma.JsonValue;
  submittedAt: Date | null;
}): QuizAttemptResult {
  const snapshot = parseQuizSnapshot(attempt.questionsSnapshot);
  if (!snapshot || attempt.submittedAt === null) throw unavailableQuiz();

  return {
    attemptId: attempt.id,
    correctAnswers: attempt.correctAnswers ?? 0,
    totalQuestions: attempt.questionCount,
    percentage: attempt.percentage ?? 0,
    passingScore: snapshot.passingScore,
    passed: attempt.passed ?? false,
    submittedAt: attempt.submittedAt.toISOString(),
  };
}

async function lockResourceForAttempt(
  transaction: Prisma.TransactionClient,
  resourceId: string,
) {
  // Quiz edits and publication changes update the resource in the same
  // transaction, so this lock keeps authorization/configuration stable while
  // an attempt is created or submitted.
  await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "resource" WHERE "id" = ${resourceId} FOR SHARE
  `);
}

async function lockAttemptReservation(
  transaction: Prisma.TransactionClient,
  userId: string,
  quizId: string,
) {
  // Serialize max-attempt reservations per student and quiz without blocking
  // unrelated students who are starting the same quiz.
  const lockKey = `${userId}:${quizId}`;
  await transaction.$queryRaw<Array<{ acquired: boolean }>>(Prisma.sql`
    SELECT true AS "acquired"
    FROM (
      SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))
    ) AS "lock"
  `);
}

export async function startOrResumeStudentQuizAttempt(
  actor: StudentQuizActor,
  resourceId: string,
): Promise<ActiveQuizAttempt> {
  if (!actor.selectedLevelId) throw unavailableQuiz();

  return prisma.$transaction(async (transaction) => {
    await lockResourceForAttempt(transaction, resourceId);

    const resource = await transaction.resource.findFirst({
      where: getVisibleLearnerResourceTreeWhere({
        role: Role.STUDENT,
        levelId: actor.selectedLevelId!,
        resourceId,
      }),
      select: {
        id: true,
        type: true,
        quiz: {
          select: {
            id: true,
            passingScore: true,
            maxAttempts: true,
            shuffleQuestions: true,
            questions: true,
          },
        },
      },
    });

    if (
      !resource ||
      resource.type !== ResourceType.QUIZ ||
      !resource.quiz
    ) {
      throw unavailableQuiz();
    }

    await lockAttemptReservation(transaction, actor.id, resource.quiz.id);

    const activeAttempt = await transaction.quizAttempt.findFirst({
      where: {
        userId: actor.id,
        quizId: resource.quiz.id,
        status: QuizAttemptStatus.IN_PROGRESS,
      },
      orderBy: { startedAt: "desc" },
      select: { id: true, questionsSnapshot: true, startedAt: true },
    });
    if (activeAttempt) return asActiveAttempt(activeAttempt);

    const [attemptsUsed, questionsResult] = await Promise.all([
      transaction.quizAttempt.count({
        where: { userId: actor.id, quizId: resource.quiz.id },
      }),
      Promise.resolve(quizQuestionsSchema.safeParse(resource.quiz.questions)),
    ]);

    if (
      resource.quiz.maxAttempts !== null &&
      attemptsUsed >= resource.quiz.maxAttempts
    ) {
      throw new QuizAttemptError(
        "ATTEMPT_LIMIT_REACHED",
        "Ya alcanzaste el límite de intentos de este cuestionario.",
      );
    }
    if (!questionsResult.success) throw unavailableQuiz();

    const orderedQuestions = resource.quiz.shuffleQuestions
      ? shuffleQuizQuestions(questionsResult.data)
      : questionsResult.data;
    const questionsSnapshot = {
      version: 1 as const,
      passingScore: resource.quiz.passingScore,
      questions: orderedQuestions,
    };
    const attempt = await transaction.quizAttempt.create({
      data: {
        userId: actor.id,
        quizId: resource.quiz.id,
        questionsSnapshot: questionsSnapshot as Prisma.InputJsonValue,
        questionCount: orderedQuestions.length,
      },
      select: { id: true, questionsSnapshot: true, startedAt: true },
    });

    return asActiveAttempt(attempt);
  });
}

export async function submitStudentQuizAttempt(
  actor: StudentQuizActor,
  attemptId: string,
  rawAnswers: unknown,
): Promise<QuizAttemptResult> {
  if (!actor.selectedLevelId) throw unavailableQuiz();
  const parsedAnswers = quizAnswersSchema.safeParse(rawAnswers);
  if (!parsedAnswers.success) {
    throw new QuizAttemptError(
      "INVALID_ANSWERS",
      "Las respuestas enviadas no tienen un formato válido.",
    );
  }

  return prisma.$transaction(async (transaction) => {
    const attemptBeforeLock = await transaction.quizAttempt.findFirst({
      where: { id: attemptId, userId: actor.id },
      select: { id: true, quizId: true },
    });
    if (!attemptBeforeLock) {
      throw new QuizAttemptError(
        "ATTEMPT_NOT_FOUND",
        "No encontramos este intento de cuestionario.",
      );
    }

    await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "quiz_attempt"
      WHERE "id" = ${attemptId} AND "userId" = ${actor.id}
      FOR UPDATE
    `);
    const attempt = await transaction.quizAttempt.findFirst({
      where: { id: attemptId, userId: actor.id },
      select: {
        id: true,
        quizId: true,
        status: true,
        questionsSnapshot: true,
        questionCount: true,
        correctAnswers: true,
        percentage: true,
        passed: true,
        submittedAt: true,
      },
    });
    if (!attempt) throw unavailableQuiz();
    const quiz = await transaction.quiz.findUnique({
      where: { id: attempt.quizId },
      select: { resourceId: true },
    });
    if (!quiz) throw unavailableQuiz();
    await lockResourceForAttempt(transaction, quiz.resourceId);

    const resource = await transaction.resource.findFirst({
      where: getVisibleLearnerResourceTreeWhere({
        role: Role.STUDENT,
        levelId: actor.selectedLevelId!,
        resourceId: quiz.resourceId,
      }),
      select: { id: true, type: true },
    });
    if (!resource || resource.type !== ResourceType.QUIZ) throw unavailableQuiz();

    if (attempt.status === QuizAttemptStatus.SUBMITTED) {
      return asResult(attempt);
    }

    const snapshot = parseQuizSnapshot(attempt.questionsSnapshot);
    if (!snapshot || snapshot.questions.length !== attempt.questionCount) {
      throw unavailableQuiz();
    }

    const questionById = new Map(
      snapshot.questions.map((question) => [question.id, question]),
    );
    for (const answer of parsedAnswers.data) {
      const question = questionById.get(answer.questionId);
      if (!question || !question.options.some((option) => option.id === answer.optionId)) {
        throw new QuizAttemptError(
          "INVALID_ANSWERS",
          "Una respuesta no corresponde a este cuestionario.",
        );
      }
    }

    const result = gradeQuizAnswers(snapshot.questions, parsedAnswers.data as QuizAnswer[]);
    const passed = result.percentage >= snapshot.passingScore;
    const submittedAt = new Date();
    await transaction.quizAttempt.update({
      where: { id: attempt.id },
      data: {
        status: QuizAttemptStatus.SUBMITTED,
        answers: parsedAnswers.data as Prisma.InputJsonValue,
        correctAnswers: result.correctAnswers,
        percentage: result.percentage,
        passed,
        submittedAt,
      },
    });

    return {
      attemptId: attempt.id,
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      percentage: result.percentage,
      passingScore: snapshot.passingScore,
      passed,
      submittedAt: submittedAt.toISOString(),
    };
  });
}
