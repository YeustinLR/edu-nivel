export type AccountFeedbackState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export function AccountFeedback({
  state,
  id,
}: {
  state: AccountFeedbackState;
  id: string;
}) {
  if (state.status !== "success" && state.status !== "error") return null;

  return (
    <p
      id={id}
      role={state.status === "error" ? "alert" : "status"}
      aria-live={state.status === "error" ? "assertive" : "polite"}
      className={
        state.status === "error"
          ? "text-sm font-medium text-red-700 dark:text-red-300"
          : "text-sm font-medium text-emerald-700 dark:text-emerald-300"
      }
    >
      {state.message}
    </p>
  );
}

export function AccountFieldError({
  id,
  message,
}: {
  id: string;
  message?: string;
}) {
  if (!message) return null;

  return (
    <p id={id} role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
      {message}
    </p>
  );
}

