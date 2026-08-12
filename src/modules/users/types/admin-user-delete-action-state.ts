export type AdminUserDeleteActionState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: { confirmationEmail?: string[]; reason?: string[] } };

export const initialAdminUserDeleteActionState: AdminUserDeleteActionState = { status: "idle" };
