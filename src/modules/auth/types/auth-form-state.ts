export type AuthFormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string }
  | { status: "done"; message: string };
