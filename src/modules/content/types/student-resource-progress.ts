export type StudentResourceProgressActionResult =
  | {
      status: "success";
      completed: boolean;
    }
  | {
      status: "error";
      code:
        | "INVALID_INPUT"
        | "CONTENT_ACCESS_REQUIRED"
        | "RESOURCE_UNAVAILABLE"
        | "PROGRESS_FAILED";
      message: string;
    };

export type StudentResourceViewActionResult =
  | { status: "success" }
  | {
      status: "error";
      code:
        | "INVALID_INPUT"
        | "CONTENT_ACCESS_REQUIRED"
        | "RESOURCE_UNAVAILABLE"
        | "PROGRESS_FAILED";
    };
