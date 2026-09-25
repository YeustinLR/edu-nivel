export const IMAGE_UPLOAD_IN_PROGRESS_MESSAGE =
  "Espera a que terminen de cargarse las imágenes antes de guardar.";

export function transitionActiveImageUploads(
  current: number,
  event: "begin" | "finish",
) {
  return event === "begin" ? current + 1 : Math.max(0, current - 1);
}

export function getImageUploadValidationMessage(activeUploads: number) {
  return activeUploads > 0 ? IMAGE_UPLOAD_IN_PROGRESS_MESSAGE : null;
}
