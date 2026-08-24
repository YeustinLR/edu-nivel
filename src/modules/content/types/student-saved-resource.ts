export type StudentSavedResourceActionResult =
  | { status: "success"; saved: boolean }
  | {
      status: "error";
      code:
        | "INVALID_INPUT"
        | "CONTENT_ACCESS_REQUIRED"
        | "RESOURCE_UNAVAILABLE"
        | "SAVE_FAILED";
      message: string;
    };
