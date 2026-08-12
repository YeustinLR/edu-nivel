export type AdminUserInvitationOperationState =
  | { status: "idle" }
  | {
      status: "success" | "error";
      message: string;
      invitationId?: string;
    };

export const initialAdminUserInvitationOperationState: AdminUserInvitationOperationState = {
  status: "idle",
};
