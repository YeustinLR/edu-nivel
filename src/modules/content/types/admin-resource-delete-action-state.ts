export type AdminResourceDeleteActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: { confirmationTitle?: string[] };
    };

export const initialAdminResourceDeleteActionState: AdminResourceDeleteActionState =
  { status: "idle" };
