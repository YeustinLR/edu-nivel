import { describe, expect, it } from "vitest";

import {
  clampPdfPage,
  getDominantWheelDelta,
  getWheelPageDirection,
} from "@/modules/content/domain/pdf-viewer-navigation";

describe("pdf viewer navigation", () => {
  it("keeps pages inside the document range", () => {
    expect(clampPdfPage(-3, 8)).toBe(1);
    expect(clampPdfPage(4.9, 8)).toBe(4);
    expect(clampPdfPage(20, 8)).toBe(8);
    expect(clampPdfPage(3, 0)).toBe(1);
  });

  it("uses the dominant trackpad axis", () => {
    expect(getDominantWheelDelta(12, 80)).toBe(80);
    expect(getDominantWheelDelta(-90, 20)).toBe(-90);
  });

  it("waits for an intentional wheel gesture before changing page", () => {
    expect(getWheelPageDirection(40)).toBe(0);
    expect(getWheelPageDirection(72)).toBe(1);
    expect(getWheelPageDirection(-90)).toBe(-1);
  });
});
