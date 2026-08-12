export type AdminUserEditField =
  | "id"
  | "expectedUpdatedAt"
  | "name"
  | "role"
  | "selectedLevelId";

export type AdminUserEditFieldErrors = Partial<
  Record<AdminUserEditField, string[]>
>;

export type AdminUserEditValues = Partial<
  Record<AdminUserEditField, string>
>;

export type AdminUserEditActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: AdminUserEditFieldErrors;
      values: AdminUserEditValues;
    }
  | { status: "success"; message: string };

export const initialAdminUserEditActionState: AdminUserEditActionState = {
  status: "idle",
};
