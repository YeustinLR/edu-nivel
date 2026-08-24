export type AdminModuleDeleteActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: { confirmationTitle?: string[] };
    };

export const initialAdminModuleDeleteActionState: AdminModuleDeleteActionState =
  { status: "idle" };
