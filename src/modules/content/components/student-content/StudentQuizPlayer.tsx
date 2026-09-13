"use client";

import { CheckCircle2, CircleHelp, LoaderCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  startStudentQuizAttemptAction,
  submitStudentQuizAttemptAction,
} from "@/modules/content/actions/student-quiz-actions";
import type { ActiveQuizAttempt, QuizAttemptResult } from "@/modules/content/domain/quiz";
import type { StudentContentResourceDetail } from "@/modules/content/types/student-content";

type QuizSummary = NonNullable<StudentContentResourceDetail["quiz"]>;

function formatAttemptDate(value: string) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StudentQuizPlayer({
  resourceId,
  quiz,
}: {
  resourceId: string;
  quiz: QuizSummary;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [attempt, setAttempt] = useState<ActiveQuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const activeFromHistory = quiz.recentAttempts.find(
    (item) => item.status === "IN_PROGRESS",
  );
  const attemptsAvailable =
    quiz.maxAttempts === null || quiz.attemptsUsed < quiz.maxAttempts;

  function beginOrResume() {
    if (isPending) return;
    setFeedback("");
    startTransition(async () => {
      try {
        const response = await startStudentQuizAttemptAction(resourceId);
        if (response.status === "error") {
          setFeedback(response.message);
          return;
        }
        setAttempt(response.data);
        setAnswers({});
        setResult(null);
      } catch {
        setFeedback("No pudimos abrir el cuestionario. Inténtalo de nuevo.");
      }
    });
  }

  function submitAnswers() {
    if (!attempt || isPending) return;
    setFeedback("");
    const submittedAnswers = Object.entries(answers).map(
      ([questionId, optionId]) => ({ questionId, optionId }),
    );
    startTransition(async () => {
      try {
        const response = await submitStudentQuizAttemptAction(
          attempt.attemptId,
          submittedAnswers,
        );
        if (response.status === "error") {
          setFeedback(response.message);
          return;
        }
        setResult(response.data);
        setAttempt(null);
        router.refresh();
      } catch {
        setFeedback("No pudimos guardar tus respuestas. Inténtalo de nuevo.");
      }
    });
  }

  if (result) {
    const resultInHistory = quiz.recentAttempts.some(
      (item) => item.id === result.attemptId,
    );
    const attemptsUsedAfterResult =
      quiz.attemptsUsed + (resultInHistory ? 0 : 1);
    return (
      <section
        aria-live="polite"
        className="space-y-4 rounded-[16px] border border-violet/20 bg-violet-100/60 p-5 dark:bg-violet/15"
      >
        <div className="flex items-start gap-3">
          {result.passed ? (
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-emerald-700 dark:text-emerald-300" />
          ) : (
            <XCircle aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-amber-700 dark:text-amber-300" />
          )}
          <div>
            <h2 className="font-heading text-lg font-bold text-ink-900 dark:text-[var(--student-text)]">
              {result.passed ? "¡Buen trabajo!" : "Sigue practicando"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-700 dark:text-[var(--student-muted)]">
              Obtuviste {result.correctAnswers} de {result.totalQuestions} respuestas correctas
              ({result.percentage}%). El porcentaje de referencia es {result.passingScore}%.
            </p>
          </div>
        </div>
        <p className="text-xs leading-5 text-ink-600 dark:text-[var(--student-muted)]">
          Este resultado es una autoevaluación y no representa una calificación académica oficial.
        </p>
        {quiz.maxAttempts === null || attemptsUsedAfterResult < quiz.maxAttempts ? (
          <button
            type="button"
            onClick={beginOrResume}
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-violet px-4 text-sm font-bold text-white hover:bg-[#5b42c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            Intentar de nuevo
          </button>
        ) : null}
        {feedback ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{feedback}</p> : null}
      </section>
    );
  }

  if (!attempt) {
    return (
      <section className="space-y-4 rounded-[16px] border border-violet/20 bg-violet-100/60 p-5 dark:bg-violet/15">
        <div className="flex items-start gap-3">
          <CircleHelp aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-violet dark:text-[var(--student-blue)]" />
          <div>
            <h2 className="font-heading text-base font-bold text-ink-900 dark:text-[var(--student-text)]">
              Autoevaluación
            </h2>
            <p className="mt-1 text-sm leading-6 text-ink-700 dark:text-[var(--student-muted)]">
              Porcentaje de referencia: {quiz.passingScore}%. {quiz.maxAttempts === null
                ? `Has iniciado ${quiz.attemptsUsed} ${quiz.attemptsUsed === 1 ? "intento" : "intentos"}.`
                : `Intentos usados: ${quiz.attemptsUsed} de ${quiz.maxAttempts}.`}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink-600 dark:text-[var(--student-muted)]">
              Tus resultados sirven para revisar tu aprendizaje; no son notas oficiales.
            </p>
          </div>
        </div>

        {attemptsAvailable || activeFromHistory ? (
          <button
            type="button"
            onClick={beginOrResume}
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-violet px-4 text-sm font-bold text-white hover:bg-[#5b42c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
            {activeFromHistory ? "Continuar intento" : "Comenzar cuestionario"}
          </button>
        ) : (
          <p className="text-sm font-semibold text-ink-700 dark:text-[var(--student-muted)]">
            Ya alcanzaste el límite de intentos.
          </p>
        )}
        {feedback ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{feedback}</p> : null}
        {quiz.recentAttempts.length > 0 ? (
          <div className="border-t border-violet/15 pt-3">
            <h3 className="text-sm font-bold text-ink-900 dark:text-[var(--student-text)]">Intentos recientes</h3>
            <ul className="mt-2 space-y-2">
              {quiz.recentAttempts.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-700 dark:text-[var(--student-muted)]">
                  <span>{formatAttemptDate(item.submittedAt ?? item.startedAt)}</span>
                  {item.status === "IN_PROGRESS" ? (
                    <span>En curso</span>
                  ) : (
                    <span>{item.correctAnswers ?? 0}/{item.questionCount} · {item.percentage ?? 0}%</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    );
  }

  const allAnswered = attempt.questions.every((question) => answers[question.id]);

  return (
    <section className="space-y-5 rounded-[16px] border border-violet/20 bg-violet-100/60 p-5 dark:bg-violet/15">
      <div>
        <h2 className="font-heading text-lg font-bold text-ink-900 dark:text-[var(--student-text)]">
          Responde el cuestionario
        </h2>
        <p className="mt-1 text-sm text-ink-700 dark:text-[var(--student-muted)]">
          Responde las {attempt.questions.length === 1 ? "pregunta" : "preguntas"} y envía tus selecciones para recibir el resultado.
        </p>
      </div>
      {attempt.questions.map((question, index) => (
        <fieldset key={question.id} className="space-y-3 rounded-xl border border-violet/15 bg-surface p-4 dark:bg-[var(--student-panel)]">
          <legend className="px-1 font-semibold text-ink-900 dark:text-[var(--student-text)]">
            {index + 1}. {question.prompt}
          </legend>
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line px-3 py-2.5 text-sm text-ink-700 hover:bg-paper dark:border-[var(--student-border)] dark:text-[var(--student-muted)] dark:hover:bg-[var(--student-soft)]">
                <input
                  type="radio"
                  name={`answer-${question.id}`}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  disabled={isPending}
                  onChange={() =>
                    setAnswers((current) => ({ ...current, [question.id]: option.id }))
                  }
                  className="mt-0.5 size-4 shrink-0 accent-violet"
                />
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {!allAnswered ? (
        <p className="text-xs text-ink-600 dark:text-[var(--student-muted)]">
          Responde todas las preguntas antes de enviar.
        </p>
      ) : null}
      {feedback ? <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{feedback}</p> : null}
      <button
        type="button"
        onClick={submitAnswers}
        disabled={isPending || !allAnswered}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-violet px-4 text-sm font-bold text-white hover:bg-[#5b42c8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        Enviar respuestas
      </button>
    </section>
  );
}
