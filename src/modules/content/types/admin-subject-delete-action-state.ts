export type AdminSubjectDeleteActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: { confirmationName?: string[] };
    };

export const initialAdminSubjectDeleteActionState: AdminSubjectDeleteActionState =
  { status: "idle" };
