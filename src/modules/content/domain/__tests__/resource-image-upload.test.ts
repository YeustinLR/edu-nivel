import { describe, expect, it } from "vitest";

import {
  IMAGE_UPLOAD_IN_PROGRESS_MESSAGE,
  getImageUploadValidationMessage,
  transitionActiveImageUploads,
} from "@/modules/content/domain/resource-image-upload";

describe("resource image upload state", () => {
  it("mantiene bloqueado el guardado hasta que terminan todas las cargas", () => {
    let activeUploads = transitionActiveImageUploads(0, "begin");
    activeUploads = transitionActiveImageUploads(activeUploads, "begin");

    expect(getImageUploadValidationMessage(activeUploads)).toBe(
      IMAGE_UPLOAD_IN_PROGRESS_MESSAGE,
    );

    activeUploads = transitionActiveImageUploads(activeUploads, "finish");
    expect(getImageUploadValidationMessage(activeUploads)).toBe(
      IMAGE_UPLOAD_IN_PROGRESS_MESSAGE,
    );

    activeUploads = transitionActiveImageUploads(activeUploads, "finish");
    expect(getImageUploadValidationMessage(activeUploads)).toBeNull();
  });

  it("nunca produce un contador negativo ante una finalización repetida", () => {
    expect(transitionActiveImageUploads(0, "finish")).toBe(0);
  });
});
