import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublicationStatus, ResourceType, Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  isR2UploadEnabled: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: { resource: { findFirst: mocks.findFirst } },
}));
vi.mock("@/server/storage/r2", () => ({
  isR2UploadEnabled: mocks.isR2UploadEnabled,
}));

import { getResourceContentDetail } from "@/server/content/content-detail-queries";

const correctOptionId = "20000000-0000-4000-8000-000000000002";

describe("resource quiz detail privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isR2UploadEnabled.mockReturnValue(false);
    mocks.findFirst.mockResolvedValue({
      id: "resource-quiz",
      moduleId: "module-1",
      type: ResourceType.QUIZ,
      title: "Autoevaluación",
      instructions: null,
      content: null,
      estimatedMinutes: null,
      isRequired: false,
      publicationStatus: PublicationStatus.PUBLISHED,
      isActive: true,
      createdById: "other-collaborator",
      createdBy: { name: "Otro colaborador" },
      updatedAt: new Date("2026-09-01T00:00:00.000Z"),
      module: {
        title: "Módulo 1",
        createdById: "other-collaborator",
        isActive: true,
        publicationStatus: PublicationStatus.PUBLISHED,
        subject: {
          isActive: true,
          level: { isActive: true },
        },
      },
      youtubeVideo: null,
      linkResource: null,
      pdfResource: null,
      imageResource: null,
      fileResource: null,
      audioResource: null,
      quiz: {
        passingScore: 70,
        maxAttempts: 2,
        shuffleQuestions: true,
        questions: [
          {
            id: "10000000-0000-4000-8000-000000000001",
            prompt: "¿Cuánto es 2 + 2?",
            options: [
              { id: "20000000-0000-4000-8000-000000000001", text: "3" },
              { id: correctOptionId, text: "4" },
            ],
            correctOptionId,
          },
        ],
      },
      gameResource: null,
    });
  });

  it("does not serialize a published quiz answer key to a non-owner collaborator", async () => {
    const resource = await getResourceContentDetail({
      resourceId: "resource-quiz",
      actor: { id: "collaborator-1", role: Role.COLLABORATOR },
    });

    expect(resource?.quiz).toMatchObject({
      questionCount: 1,
      questions: [],
    });
    expect(JSON.stringify(resource)).not.toContain("correctOptionId");
    expect(JSON.stringify(resource)).not.toContain(correctOptionId);
  });
});
