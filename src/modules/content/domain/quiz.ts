import { z } from "zod";

export const quizOptionSchema = z.object({
  id: z.uuid(),
  text: z.string().trim().min(1, "Cada opción necesita texto.").max(500),
});

export const quizQuestionSchema = z
  .object({
    id: z.uuid(),
    prompt: z.string().trim().min(1, "Escribe el enunciado de la pregunta.").max(2_000),
    options: z.array(quizOptionSchema).min(2, "Cada pregunta necesita al menos dos opciones.").max(8),
    correctOptionId: z.uuid(),
  })
  .superRefine((question, context) => {
    const optionIds = new Set<string>();
    question.options.forEach((option, index) => {
      if (optionIds.has(option.id)) {
        context.addIssue({
          code: "custom",
          path: ["options", index, "id"],
          message: "Los identificadores de las opciones deben ser únicos.",
        });
      }
      optionIds.add(option.id);
    });

    if (!optionIds.has(question.correctOptionId)) {
      context.addIssue({
        code: "custom",
        path: ["correctOptionId"],
        message: "Selecciona una opción correcta de esta pregunta.",
      });
    }
  });

export const quizQuestionsSchema = z
  .array(quizQuestionSchema)
  .min(1, "Agrega al menos una pregunta.")
  .max(100, "Un cuestionario no puede superar 100 preguntas.")
  .superRefine((questions, context) => {
    const questionIds = new Set<string>();
    questions.forEach((question, index) => {
      if (questionIds.has(question.id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          message: "Los identificadores de las preguntas deben ser únicos.",
        });
      }
      questionIds.add(question.id);
    });
  });

export const quizPassingScoreSchema = z
  .number({ error: "El porcentaje de referencia debe ser un número." })
  .int("El porcentaje debe ser un número entero.")
  .min(0, "El porcentaje no puede ser menor que 0.")
  .max(100, "El porcentaje no puede superar 100.");

export const quizMaxAttemptsSchema = z
  .number({ error: "El límite de intentos debe ser un número entero." })
  .int("El límite de intentos debe ser un número entero.")
  .min(1, "El límite debe ser al menos un intento.")
  .max(100, "El límite no puede superar 100 intentos.");

export const quizSnapshotSchema = z.object({
  version: z.literal(1),
  passingScore: quizPassingScoreSchema,
  questions: quizQuestionsSchema,
});

export const quizAnswersSchema = z
  .array(
    z.object({
      questionId: z.uuid(),
      optionId: z.uuid(),
    }),
  )
  .max(100)
  .superRefine((answers, context) => {
    const questionIds = new Set<string>();
    answers.forEach((answer, index) => {
      if (questionIds.has(answer.questionId)) {
        context.addIssue({
          code: "custom",
          path: [index, "questionId"],
          message: "Solo puedes enviar una respuesta por pregunta.",
        });
      }
      questionIds.add(answer.questionId);
    });
  });

export type QuizOption = z.output<typeof quizOptionSchema>;
export type QuizQuestion = z.output<typeof quizQuestionSchema>;
export type QuizSnapshot = z.output<typeof quizSnapshotSchema>;
export type QuizAnswerSubmission = z.output<typeof quizAnswersSchema>;

export type LearnerQuizQuestion = Omit<QuizQuestion, "correctOptionId"> & {
  options: QuizOption[];
};

export type ActiveQuizAttempt = {
  attemptId: string;
  passingScore: number;
  questions: LearnerQuizQuestion[];
  startedAt: string;
};

export type QuizAttemptResult = {
  attemptId: string;
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  passingScore: number;
  passed: boolean;
  submittedAt: string;
};

export type QuizAnswer = { questionId: string; optionId: string };

export const MAX_QUIZ_QUESTIONS_JSON_CHARACTERS = 1_000_000;

export function parseQuizQuestionsJson(value: string) {
  return z
    .string()
    .max(
      MAX_QUIZ_QUESTIONS_JSON_CHARACTERS,
      "El cuestionario no puede superar 1 000 000 caracteres.",
    )
    .transform((serialized, context) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(serialized);
      } catch {
        context.addIssue({
          code: "custom",
          message: "Las preguntas del cuestionario no tienen un formato válido.",
        });
        return z.NEVER;
      }

      const result = quizQuestionsSchema.safeParse(parsed);
      if (!result.success) {
        for (const issue of result.error.issues) {
          context.addIssue({
            code: "custom",
            path: issue.path,
            message: issue.message,
          });
        }
        return z.NEVER;
      }

      return result.data;
    })
    .safeParse(value);
}

export function parseQuizSnapshot(value: unknown): QuizSnapshot | null {
  const result = quizSnapshotSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function toLearnerQuizQuestions(
  questions: QuizQuestion[],
): LearnerQuizQuestion[] {
  return questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
    })),
  }));
}

export function shuffleQuizQuestions(questions: QuizQuestion[]) {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function gradeQuizAnswers(
  questions: QuizQuestion[],
  answers: QuizAnswer[],
) {
  const selectedByQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer.optionId]),
  );
  const correctAnswers = questions.reduce(
    (total, question) =>
      total +
      Number(selectedByQuestion.get(question.id) === question.correctOptionId),
    0,
  );
  const percentage = Math.round((correctAnswers / questions.length) * 10_000) / 100;

  return { correctAnswers, totalQuestions: questions.length, percentage };
}
