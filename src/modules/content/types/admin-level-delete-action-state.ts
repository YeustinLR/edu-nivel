export type AdminLevelDeleteActionState =
  | { status: "idle" }
  | {
      status: "error";
      message: string;
      fieldErrors?: { confirmationLabel?: string[] };
    };

export const initialAdminLevelDeleteActionState: AdminLevelDeleteActionState = {
  status: "idle",
};
