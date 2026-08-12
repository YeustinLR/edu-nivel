import type { FormActionErrorState } from "@/modules/content/types/form-action-state";

type SerializableActionValue = string | boolean;

export function createValidationError<TFieldErrors, TValues>(
  fieldErrors: TFieldErrors,
  values: TValues,
): FormActionErrorState<TFieldErrors, TValues> {
  return {
    status: "error",
    message: "Revisa los campos indicados.",
    fieldErrors,
    values,
  };
}

export function toActionValues(
  values: Record<string, unknown>,
): Record<string, SerializableActionValue> {
  return Object.fromEntries(
    Object.entries(values).filter(
      (entry): entry is [string, SerializableActionValue] =>
        typeof entry[1] === "string" || typeof entry[1] === "boolean",
    ),
  );
}
