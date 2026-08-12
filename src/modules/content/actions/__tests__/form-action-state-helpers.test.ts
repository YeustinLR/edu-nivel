import { describe, expect, it } from "vitest";

import {
  createValidationError,
  toActionValues,
} from "@/modules/content/actions/form-action-state-helpers";

describe("form action state helpers", () => {
  it("builds the shared validation error shape", () => {
    expect(
      createValidationError(
        { title: ["El título es obligatorio."] },
        { title: "" },
      ),
    ).toEqual({
      status: "error",
      message: "Revisa los campos indicados.",
      fieldErrors: { title: ["El título es obligatorio."] },
      values: { title: "" },
    });
  });

  it("keeps only serializable form values", () => {
    expect(
      toActionValues({
        title: "Fracciones",
        isActive: true,
        count: 4,
        optional: undefined,
        metadata: { source: "test" },
      }),
    ).toEqual({
      title: "Fracciones",
      isActive: true,
    });
  });
});
