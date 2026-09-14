"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

import type { QuizQuestion } from "@/modules/content/domain/quiz";

function newQuestion(): QuizQuestion {
  const firstOptionId = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    prompt: "",
    options: [
      { id: firstOptionId, text: "" },
      { id: crypto.randomUUID(), text: "" },
    ],
    correctOptionId: firstOptionId,
  };
}

function QuestionActionButton({
  label,
  ariaLabel = label,
  tooltipId,
  disabled,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  ariaLabel?: string;
  tooltipId: string;
  disabled?: boolean;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="group/question-action relative inline-flex size-9 shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-describedby={tooltipId}
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex size-9 items-center justify-center rounded-md border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-40 ${
          danger
            ? "border-transparent text-muted hover:bg-red-500/10 hover:text-red-600"
            : "border-border text-muted hover:bg-surface-elevated hover:text-foreground"
        }`}
      >
        {children}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/question-action:opacity-100 group-focus-within/question-action:opacity-100 motion-reduce:transition-none"
      >
        {label}
      </span>
    </span>
  );
}

export function QuizQuestionEditor({
  questions,
  onChange,
  disabled = false,
  error,
}: {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  function updateQuestion(questionId: string, update: (question: QuizQuestion) => QuizQuestion) {
    onChange(
      questions.map((question) =>
        question.id === questionId ? update(question) : question,
      ),
    );
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    const next = [...questions];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  function addQuestion(afterIndex: number) {
    const next = [...questions];
    next.splice(afterIndex + 1, 0, newQuestion());
    onChange(next);
  }

  return (
    <section aria-labelledby="quiz-questions-heading" className="space-y-4">
      <div>
        <h2 id="quiz-questions-heading" className="font-semibold text-foreground">
          Preguntas
        </h2>
        <p className="mt-1 text-sm text-muted">
          Cada pregunta admite de dos a ocho opciones y una respuesta correcta.
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-5">
          <p className="text-sm text-muted">
            Añade al menos una pregunta para crear el cuestionario.
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => addQuestion(-1)}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/5 px-3 text-sm font-semibold text-secondary hover:bg-secondary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden="true" className="size-4" />
            Añadir primera pregunta
          </button>
        </div>
      ) : null}

      {questions.map((question, questionIndex) => (
        <fieldset
          key={question.id}
          disabled={disabled}
          className="space-y-4 rounded-xl border border-border bg-background p-4 sm:p-5"
        >
          <legend className="sr-only">Pregunta {questionIndex + 1}</legend>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-semibold text-foreground">Pregunta {questionIndex + 1}</p>
            <div className="flex items-center gap-1">
              <QuestionActionButton
                label="Mover hacia arriba"
                ariaLabel={`Mover pregunta ${questionIndex + 1} hacia arriba`}
                tooltipId={`move-question-up-tooltip-${question.id}`}
                disabled={disabled || questionIndex === 0}
                onClick={() => moveQuestion(questionIndex, -1)}
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </QuestionActionButton>
              <QuestionActionButton
                label="Mover hacia abajo"
                ariaLabel={`Mover pregunta ${questionIndex + 1} hacia abajo`}
                tooltipId={`move-question-down-tooltip-${question.id}`}
                disabled={disabled || questionIndex === questions.length - 1}
                onClick={() => moveQuestion(questionIndex, 1)}
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </QuestionActionButton>
              <QuestionActionButton
                label={
                  questions.length >= 100
                    ? "Límite de 100 preguntas"
                    : "Añadir pregunta"
                }
                ariaLabel={`Añadir pregunta después de la pregunta ${questionIndex + 1}`}
                tooltipId={`add-question-tooltip-${question.id}`}
                disabled={disabled || questions.length >= 100}
                onClick={() => addQuestion(questionIndex)}
              >
                <Plus aria-hidden="true" className="size-4" />
              </QuestionActionButton>
              <QuestionActionButton
                label="Eliminar pregunta"
                ariaLabel={`Eliminar pregunta ${questionIndex + 1}`}
                tooltipId={`delete-question-tooltip-${question.id}`}
                danger
                onClick={() =>
                  onChange(questions.filter((item) => item.id !== question.id))
                }
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </QuestionActionButton>
            </div>
          </div>

          <label className="block space-y-1.5 text-sm font-medium text-foreground">
            Enunciado
            <textarea
              required
              rows={3}
              maxLength={2_000}
              value={question.prompt}
              onChange={(event) =>
                updateQuestion(question.id, (current) => ({
                  ...current,
                  prompt: event.target.value,
                }))
              }
              placeholder="Escribe la pregunta"
              className="w-full resize-y rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Opciones</p>
              <span className="text-xs text-muted">Marca la respuesta correcta</span>
            </div>
            {question.options.map((option, optionIndex) => (
              <div key={option.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  aria-label={`Marcar opción ${optionIndex + 1} como correcta`}
                  checked={question.correctOptionId === option.id}
                  onChange={() =>
                    updateQuestion(question.id, (current) => ({
                      ...current,
                      correctOptionId: option.id,
                    }))
                  }
                  className="size-4 shrink-0 accent-secondary"
                />
                <input
                  type="text"
                  required
                  maxLength={500}
                  value={option.text}
                  onChange={(event) =>
                    updateQuestion(question.id, (current) => ({
                      ...current,
                      options: current.options.map((item) =>
                        item.id === option.id
                          ? { ...item, text: event.target.value }
                          : item,
                      ),
                    }))
                  }
                  aria-label={`Texto de opción ${optionIndex + 1}`}
                  placeholder={`Opción ${optionIndex + 1}`}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20"
                />
                <QuestionActionButton
                  label="Eliminar opción"
                  ariaLabel={`Eliminar opción ${optionIndex + 1} de pregunta ${questionIndex + 1}`}
                  tooltipId={`delete-option-tooltip-${question.id}-${option.id}`}
                  disabled={question.options.length <= 2}
                  onClick={() =>
                    updateQuestion(question.id, (current) => {
                      const options = current.options.filter(
                        (item) => item.id !== option.id,
                      );
                      return {
                        ...current,
                        options,
                        correctOptionId:
                          current.correctOptionId === option.id
                            ? options[0].id
                            : current.correctOptionId,
                      };
                    })
                  }
                  danger
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </QuestionActionButton>
              </div>
            ))}
            <button
              type="button"
              disabled={question.options.length >= 8}
              onClick={() =>
                updateQuestion(question.id, (current) => ({
                  ...current,
                  options: [...current.options, { id: crypto.randomUUID(), text: "" }],
                }))
              }
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-secondary hover:bg-secondary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
            >
              <Plus aria-hidden="true" className="size-4" />
              Añadir opción
            </button>
          </div>
        </fieldset>
      ))}
      {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
    </section>
  );
}
