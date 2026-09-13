import { describe, expect, it } from "vitest";

import {
  gradeQuizAnswers,
  parseQuizQuestionsJson,
  quizQuestionsSchema,
  toLearnerQuizQuestions,
  type QuizQuestion,
} from "@/modules/content/domain/quiz";

const questions: QuizQuestion[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    prompt: "¿Cuánto es 2 + 2?",
    options: [
      { id: "20000000-0000-4000-8000-000000000001", text: "3" },
      { id: "20000000-0000-4000-8000-000000000002", text: "4" },
    ],
    correctOptionId: "20000000-0000-4000-8000-000000000002",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    prompt: "¿Cuánto es 3 + 2?",
    options: [
      { id: "20000000-0000-4000-8000-000000000003", text: "5" },
      { id: "20000000-0000-4000-8000-000000000004", text: "6" },
    ],
    correctOptionId: "20000000-0000-4000-8000-000000000003",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    prompt: "¿Cuánto es 3 + 3?",
    options: [
      { id: "20000000-0000-4000-8000-000000000005", text: "6" },
      { id: "20000000-0000-4000-8000-000000000006", text: "7" },
    ],
    correctOptionId: "20000000-0000-4000-8000-000000000005",
  },
];

describe("quiz question model", () => {
  it("accepts valid questions with stable question and option identifiers", () => {
    expect(quizQuestionsSchema.parse(questions)).toEqual(questions);
  });

  it("requires at least one question and at least two options", () => {
    expect(quizQuestionsSchema.safeParse([]).success).toBe(false);
    expect(
      quizQuestionsSchema.safeParse([
        { ...questions[0], options: [questions[0].options[0]] },
      ]).success,
    ).toBe(false);
  });

  it("requires the correct option to belong to the question and unique question IDs", () => {
    expect(
      quizQuestionsSchema.safeParse([
        { ...questions[0], correctOptionId: "20000000-0000-4000-8000-000000000006" },
      ]).success,
    ).toBe(false);
    expect(
      quizQuestionsSchema.safeParse([questions[0], { ...questions[1], id: questions[0].id }])
        .success,
    ).toBe(false);
  });

  it("rejects invalid JSON before data reaches persistence", () => {
    expect(parseQuizQuestionsJson("not json").success).toBe(false);
  });

  it("removes the correct option identifier from learner question data", () => {
    const learnerData = toLearnerQuizQuestions(questions);
    expect(JSON.stringify(learnerData)).not.toContain("correctOptionId");
    expect(learnerData[0]).not.toHaveProperty("correctOptionId");
  });
});

describe("quiz grading", () => {
  it("calculates an integer count and rounded percentage on the server model", () => {
    expect(
      gradeQuizAnswers(questions, [
        {
          questionId: questions[0].id,
          optionId: questions[0].correctOptionId,
        },
        {
          questionId: questions[1].id,
          optionId: questions[1].correctOptionId,
        },
      ]),
    ).toEqual({ correctAnswers: 2, totalQuestions: 3, percentage: 66.67 });
  });

  it("counts unanswered questions as incorrect", () => {
    expect(gradeQuizAnswers(questions, [])).toEqual({
      correctAnswers: 0,
      totalQuestions: 3,
      percentage: 0,
    });
  });
});
