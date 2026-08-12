export type AdminUserCreateField =
  | "name"
  | "email"
  | "role"
  | "selectedLevelId"
  | "password"
  | "confirmPassword";

export type AdminUserCreateActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<Record<AdminUserCreateField, string[]>>;
      values?: Partial<Record<"name" | "email" | "role" | "selectedLevelId", string>>;
    }
  | { status: "success"; userId: string; email: string };

export const initialAdminUserCreateActionState: AdminUserCreateActionState = { status: "idle" };
