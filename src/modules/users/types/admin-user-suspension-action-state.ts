export type AdminUserSuspensionActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: { reason?: string[]; expiresAt?: string[] } };

export const initialAdminUserSuspensionActionState: AdminUserSuspensionActionState = {
  status: "idle",
};
