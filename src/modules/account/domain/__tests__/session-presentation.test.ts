import { describe, expect, it } from "vitest";

import { describeSession } from "@/modules/account/domain/session-presentation";

describe("describeSession", () => {
  it("identifica navegador y sistema sin exponer el user-agent completo", () => {
    expect(describeSession(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36",
    )).toBe("Chrome en Windows");
  });

  it("distingue Edge antes de Chrome", () => {
    expect(describeSession(
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0",
    )).toBe("Microsoft Edge en Windows");
  });

  it("tolera sesiones sin agente", () => {
    expect(describeSession(null)).toBe("Dispositivo desconocido");
  });
});

