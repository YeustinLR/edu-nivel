export type CompleteAccountActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[] | undefined> };

export const initialCompleteAccountActionState: CompleteAccountActionState = { status: "idle" };
