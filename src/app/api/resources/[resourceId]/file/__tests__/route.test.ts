import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContentAudience,
  PublicationStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/client";

const {
  createPresignedDownloadUrlMock,
  findUniqueMock,
  getPremiumAccessDecisionMock,
  isR2UploadEnabledMock,
  requireUserMock,
} = vi.hoisted(() => ({
  createPresignedDownloadUrlMock: vi.fn(),
  findUniqueMock: vi.fn(),
  getPremiumAccessDecisionMock: vi.fn(),
  isR2UploadEnabledMock: vi.fn(),
  requireUserMock: vi.fn(),
}));

vi.mock("@/server/auth/guards", () => ({
  getPremiumAccessDecision: getPremiumAccessDecisionMock,
  requireUser: requireUserMock,
}));

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    resource: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("@/server/storage/r2", () => ({
  createPresignedDownloadUrl: createPresignedDownloadUrlMock,
  isR2UploadEnabled: isR2UploadEnabledMock,
}));

import { GET } from "@/app/api/resources/[resourceId]/file/route";

const params = { params: Promise.resolve({ resourceId: "resource-1" }) };

function pdfResource() {
  return {
    id: "resource-1",
    type: ResourceType.PDF,
    createdById: "author-1",
    publicationStatus: PublicationStatus.PUBLISHED,
    isActive: true,
    pdfResource: {
      storageKey: "resources/resource-1/file.pdf",
      originalName: "guia.pdf",
      mimeType: "application/pdf",
    },
    imageResource: null,
    fileResource: null,
    audioResource: null,
    module: {
      createdById: "author-1",
      publicationStatus: PublicationStatus.PUBLISHED,
      isActive: true,
      audience: ContentAudience.BOTH,
      subject: {
        isActive: true,
        level: { id: "level-1", isActive: true },
      },
    },
  };
}

describe("GET /api/resources/[resourceId]/file", () => {
  beforeEach(() => {
    isR2UploadEnabledMock.mockReset().mockReturnValue(true);
    requireUserMock.mockReset().mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
    });
    findUniqueMock.mockReset().mockResolvedValue(pdfResource());
    getPremiumAccessDecisionMock.mockReset().mockResolvedValue({
      decision: { allowed: true, code: "ACCESS_GRANTED" },
    });
    createPresignedDownloadUrlMock
      .mockReset()
      .mockResolvedValue("https://r2.example/signed-pdf");
  });

  it("authorizes a visible subscribed PDF and returns a non-cacheable redirect", async () => {
    const response = await GET(
      new Request("http://localhost/api/resources/resource-1/file"),
      params,
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://r2.example/signed-pdf",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(getPremiumAccessDecisionMock).toHaveBeenCalledWith("level-1");
    expect(createPresignedDownloadUrlMock).toHaveBeenCalledWith({
      key: "resources/resource-1/file.pdf",
      originalName: "guia.pdf",
      contentType: "application/pdf",
    });
  });

  it("rejects a learner outside the resource audience", async () => {
    findUniqueMock.mockResolvedValue({
      ...pdfResource(),
      module: {
        ...pdfResource().module,
        audience: ContentAudience.TEACHER,
      },
    });

    const response = await GET(
      new Request("http://localhost/api/resources/resource-1/file"),
      params,
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "RESOURCE_FORBIDDEN" });
    expect(getPremiumAccessDecisionMock).not.toHaveBeenCalled();
    expect(createPresignedDownloadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects a learner without premium access", async () => {
    getPremiumAccessDecisionMock.mockResolvedValue({
      decision: { allowed: false, code: "SUBSCRIPTION_REQUIRED" },
    });

    const response = await GET(
      new Request("http://localhost/api/resources/resource-1/file"),
      params,
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "SUBSCRIPTION_REQUIRED",
    });
    expect(createPresignedDownloadUrlMock).not.toHaveBeenCalled();
  });

  it("keeps existing management access for administrators", async () => {
    requireUserMock.mockResolvedValue({ id: "admin-1", role: Role.ADMIN });
    findUniqueMock.mockResolvedValue({
      ...pdfResource(),
      publicationStatus: PublicationStatus.DRAFT,
      isActive: false,
    });

    const response = await GET(
      new Request("http://localhost/api/resources/resource-1/file"),
      params,
    );

    expect(response.status).toBe(307);
    expect(getPremiumAccessDecisionMock).not.toHaveBeenCalled();
  });

  it("keeps owner access for collaborators without requiring publication", async () => {
    requireUserMock.mockResolvedValue({
      id: "author-1",
      role: Role.COLLABORATOR,
    });
    findUniqueMock.mockResolvedValue({
      ...pdfResource(),
      publicationStatus: PublicationStatus.DRAFT,
      isActive: false,
    });

    const response = await GET(
      new Request("http://localhost/api/resources/resource-1/file"),
      params,
    );

    expect(response.status).toBe(307);
    expect(getPremiumAccessDecisionMock).not.toHaveBeenCalled();
  });

  it("does not let another collaborator bypass editorial visibility", async () => {
    requireUserMock.mockResolvedValue({
      id: "collaborator-2",
      role: Role.COLLABORATOR,
    });
    findUniqueMock.mockResolvedValue({
      ...pdfResource(),
      publicationStatus: PublicationStatus.DRAFT,
    });

    const response = await GET(
      new Request("http://localhost/api/resources/resource-1/file"),
      params,
    );

    expect(response.status).toBe(403);
    expect(createPresignedDownloadUrlMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the resource does not exist", async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/resources/resource-1/file"),
      params,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "RESOURCE_NOT_FOUND" });
    expect(createPresignedDownloadUrlMock).not.toHaveBeenCalled();
  });

  it("returns 503 without issuing a URL when R2 is disabled", async () => {
    isR2UploadEnabledMock.mockReturnValue(false);

    const response = await GET(
      new Request("http://localhost/api/resources/resource-1/file"),
      params,
    );

    expect(response.status).toBe(503);
    expect(requireUserMock).not.toHaveBeenCalled();
    expect(createPresignedDownloadUrlMock).not.toHaveBeenCalled();
  });
});
