export type AdminUserInvitationField =
  | "name"
  | "email"
  | "role"
  | "selectedLevelId";

export type AdminUserInvitationFieldErrors = Partial<
  Record<AdminUserInvitationField, string[]>
>;

export type AdminUserInvitationValues = Partial<
  Record<AdminUserInvitationField, string>
>;

export type AdminUserInvitationActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: AdminUserInvitationFieldErrors;
      values: AdminUserInvitationValues;
    }
  | { status: "success"; message: string; email: string };

export const initialAdminUserInvitationActionState: AdminUserInvitationActionState = {
  status: "idle",
};
