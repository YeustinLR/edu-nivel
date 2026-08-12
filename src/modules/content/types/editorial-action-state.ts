export type EditorialActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: { reviewNote?: string[] };
    };

export const initialEditorialActionState: EditorialActionState = {
  status: "idle",
};
