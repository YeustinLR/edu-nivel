import { randomUUID } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/enums";

vi.mock("server-only", () => ({}));

const RUN_DATABASE_INTEGRATION = process.env.RUN_DATABASE_INTEGRATION === "1";

describe.skipIf(!RUN_DATABASE_INTEGRATION)("student quiz attempts with PostgreSQL", () => {
  it("serializes simultaneous starts, grades on the server, and preserves the attempt snapshot", async () => {
    const { config } = await import("dotenv");
    config({ path: [".env.local", ".env"], quiet: true });

    const [{ prisma }, attemptsService] = await Promise.all([
      import("@/server/db/prisma"),
      import("@/server/content/quiz-attempts"),
    ]);
    const unique = randomUUID();
    const marker = `db-quiz-${unique}`;
    const adminId = `${marker}-admin`;
    const studentId = `${marker}-student`;
    const levelNumber = 1_800_000_000 + Number.parseInt(unique.slice(0, 7), 16);
    let levelId: string | undefined;

    const questions = [
      {
        id: randomUUID(),
        prompt: "Pregunta uno",
        options: [
          { id: randomUUID(), text: "Incorrecta" },
          { id: randomUUID(), text: "Correcta" },
        ],
        correctOptionId: "",
      },
      {
        id: randomUUID(),
        prompt: "Pregunta dos",
        options: [
          { id: randomUUID(), text: "Correcta" },
          { id: randomUUID(), text: "Incorrecta" },
        ],
        correctOptionId: "",
      },
      {
        id: randomUUID(),
        prompt: "Pregunta tres",
        options: [
          { id: randomUUID(), text: "Correcta" },
          { id: randomUUID(), text: "Incorrecta" },
        ],
        correctOptionId: "",
      },
    ];
    questions[0].correctOptionId = questions[0].options[1].id;
    questions[1].correctOptionId = questions[1].options[0].id;
    questions[2].correctOptionId = questions[2].options[0].id;

    try {
      await prisma.user.createMany({
        data: [
          {
            id: adminId,
            name: "Quiz Integration Admin",
            email: `${adminId}@example.com`,
            emailVerified: true,
            role: Role.ADMIN,
          },
          {
            id: studentId,
            name: "Quiz Integration Student",
            email: `${studentId}@example.com`,
            emailVerified: true,
            role: Role.STUDENT,
          },
        ],
      });
      const level = await prisma.level.create({
        data: { levelNumber, description: marker },
      });
      levelId = level.id;
      const subject = await prisma.subject.create({
        data: { levelId: level.id, name: `Materia ${marker}` },
      });
      const moduleRecord = await prisma.module.create({
        data: {
          subjectId: subject.id,
          title: `Módulo ${marker}`,
          audience: ContentAudience.BOTH,
          createdById: adminId,
          publicationStatus: PublicationStatus.PUBLISHED,
        },
      });
      const resource = await prisma.resource.create({
        data: {
          moduleId: moduleRecord.id,
          type: ResourceType.QUIZ,
          title: `Autoevaluación ${marker}`,
          createdById: adminId,
          publicationStatus: PublicationStatus.PUBLISHED,
          quiz: {
            create: {
              passingScore: 67,
              maxAttempts: 1,
              shuffleQuestions: true,
              questions,
            },
          },
        },
        select: { id: true },
      });
      const actor = { id: studentId, selectedLevelId: level.id };

      const [firstStart, concurrentStart] = await Promise.all([
        attemptsService.startOrResumeStudentQuizAttempt(actor, resource.id),
        attemptsService.startOrResumeStudentQuizAttempt(actor, resource.id),
      ]);
      expect(firstStart.attemptId).toBe(concurrentStart.attemptId);
      expect(JSON.stringify(firstStart.questions)).not.toContain("correctOptionId");
      expect(
        firstStart.questions.every(
          (question) => !("correctOptionId" in question),
        ),
      ).toBe(true);

      const result = await attemptsService.submitStudentQuizAttempt(
        actor,
        firstStart.attemptId,
        questions.slice(0, 2).map((question) => ({
          questionId: question.id,
          optionId: question.correctOptionId,
        })),
      );
      expect(result).toMatchObject({
        correctAnswers: 2,
        totalQuestions: 3,
        percentage: 66.67,
        passingScore: 67,
        passed: false,
      });

      await expect(
        attemptsService.startOrResumeStudentQuizAttempt(actor, resource.id),
      ).rejects.toMatchObject({ code: "ATTEMPT_LIMIT_REACHED" });

      const attemptBeforeEdit = await prisma.quizAttempt.findUniqueOrThrow({
        where: { id: firstStart.attemptId },
        select: {
          questionsSnapshot: true,
          correctAnswers: true,
          percentage: true,
          passed: true,
        },
      });
      const changedQuestions = questions.map((question) => ({
        ...question,
        prompt: `${question.prompt} actualizada`,
      }));
      await prisma.resource.update({
        where: { id: resource.id },
        data: {
          publicationStatus: PublicationStatus.DRAFT,
          quiz: {
            update: { questions: changedQuestions },
          },
        },
      });
      const attemptAfterEdit = await prisma.quizAttempt.findUniqueOrThrow({
        where: { id: firstStart.attemptId },
        select: {
          questionsSnapshot: true,
          correctAnswers: true,
          percentage: true,
          passed: true,
        },
      });
      expect(attemptAfterEdit).toEqual(attemptBeforeEdit);
      expect(JSON.stringify(attemptAfterEdit.questionsSnapshot)).not.toContain("actualizada");
    } finally {
      if (levelId) await prisma.level.deleteMany({ where: { id: levelId } });
      await prisma.user.deleteMany({ where: { id: { in: [adminId, studentId] } } });
    }
  }, 30_000);
});
