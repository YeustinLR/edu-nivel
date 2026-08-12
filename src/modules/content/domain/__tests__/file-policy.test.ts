import { describe, expect, it } from "vitest";

import { ResourceType } from "@/generated/prisma/enums";
import {
  FilePolicyError,
  getFilePolicy,
} from "@/modules/content/domain/file-policy";

describe("getFilePolicy", () => {
  it("permite PDF de hasta 50 MB", () => {
    expect(
      getFilePolicy("application/pdf", 50 * 1024 * 1024, ResourceType.PDF),
    ).toMatchObject({ extension: "pdf" });
  });

  it("permite JPEG, PNG y WebP de hasta 10 MB", () => {
    for (const mimeType of ["image/jpeg", "image/png", "image/webp"]) {
      expect(
        getFilePolicy(mimeType, 10 * 1024 * 1024, ResourceType.IMAGE),
      ).toBeDefined();
    }
  });

  it("rechaza SVG aunque se declare como imagen", () => {
    expect(() =>
      getFilePolicy("image/svg+xml", 1_000, ResourceType.IMAGE),
    ).toThrowError(FilePolicyError);
  });

  it("rechaza un tipo de recurso que no coincide con el MIME", () => {
    expect(() =>
      getFilePolicy("application/pdf", 1_000, ResourceType.IMAGE),
    ).toThrowError(FilePolicyError);
  });

  it("rechaza archivos que superan el limite", () => {
    expect(() =>
      getFilePolicy("image/png", 10 * 1024 * 1024 + 1, ResourceType.IMAGE),
    ).toThrowError(
      expect.objectContaining({
        code: "FILE_TOO_LARGE",
      }),
    );
  });
});
