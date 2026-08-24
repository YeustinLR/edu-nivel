export const PDF_WHEEL_PAGE_THRESHOLD = 72;

export function clampPdfPage(page: number, pageCount: number) {
  if (pageCount <= 0) return 1;
  return Math.min(pageCount, Math.max(1, Math.trunc(page)));
}

export function getDominantWheelDelta(deltaX: number, deltaY: number) {
  return Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
}

export function getWheelPageDirection(
  accumulatedDelta: number,
  threshold = PDF_WHEEL_PAGE_THRESHOLD,
): -1 | 0 | 1 {
  if (Math.abs(accumulatedDelta) < threshold) return 0;
  return accumulatedDelta > 0 ? 1 : -1;
}
