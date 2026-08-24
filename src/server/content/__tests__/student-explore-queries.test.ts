import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentStatus, ResourceType, Role } from "@/generated/prisma/enums";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getPublishedStudentCatalog: vi.fn(),
  subscriptionFindMany: vi.fn(),
  paymentFindMany: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/content/published-academic-catalog-queries", () => ({
  getPublishedStudentCatalog: mocks.getPublishedStudentCatalog,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    subscription: { findMany: mocks.subscriptionFindMany },
    payment: { findMany: mocks.paymentFindMany },
  },
}));

import { getStudentExploreData } from "@/server/content/student-explore-queries";

describe("student explore queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      emailVerified: true,
      selectedLevelId: "level-7",
    });
    mocks.getPublishedStudentCatalog.mockResolvedValue([
      {
        id: "level-1",
        levelNumber: 1,
        description: "Primaria",
        requiresSubscription: true,
        subjects: [],
      },
      {
        id: "level-7",
        levelNumber: 7,
        description: "Secundaria",
        requiresSubscription: true,
        subjects: [
          {
            id: "subject-math",
            name: "Matemáticas",
            modules: [
              {
                id: "module-fractions",
                title: "Fracciones",
                resources: [
                  { id: "resource-content", title: "Fracciones equivalentes", type: ResourceType.NOTE },
                  { id: "resource-pdf", title: "Ejercicios", type: ResourceType.PDF },
                ],
              },
            ],
          },
        ],
      },
    ]);
    mocks.subscriptionFindMany.mockResolvedValue([]);
    mocks.paymentFindMany.mockResolvedValue([]);
  });

  it("requires STUDENT before composing cached catalog with personal data", async () => {
    await getStudentExploreData({ requestedStage: "secondary", requestedLevelId: "level-7" });

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.STUDENT);
    expect(mocks.getPublishedStudentCatalog).toHaveBeenCalledOnce();
    expect(mocks.subscriptionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "student-1" }) }),
    );
    expect(mocks.paymentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: "student-1" }) }),
    );
  });

  it("calculates real counts, stage and safe preview metadata", async () => {
    const result = await getStudentExploreData({ requestedLevelId: "level-7" });

    expect(result.stage).toBe("secondary");
    expect(result.levelDetails).toHaveLength(2);
    expect(result.levels[1]).toMatchObject({
      name: "Séptimo año",
      subjectCount: 1,
      moduleCount: 1,
      resourceCount: 2,
      resourceTypes: [ResourceType.NOTE, ResourceType.PDF],
      access: { status: "LOCKED" },
    });
    expect(result.selectedLevel?.subjects[0]).toMatchObject({
      name: "Matemáticas",
      moduleCount: 1,
      resourceCount: 2,
    });
    const serialized = JSON.stringify(result);
    for (const privateField of ["\"storageKey\":", "\"signedUrl\":", "\"videoId\":", "\"content\":", "\"url\":", "\"config\":", "\"questions\":"]) {
      expect(serialized).not.toContain(privateField);
    }
    expect(mocks.getPublishedStudentCatalog).toHaveBeenCalledOnce();
  });

  it("keeps active empty levels and resolves invalid deep links safely", async () => {
    const result = await getStudentExploreData({ requestedStage: "primary", requestedLevelId: "missing-level", requestedSubjectId: "missing-subject" });

    expect(result.levels[0]).toMatchObject({ id: "level-1", subjectCount: 0, moduleCount: 0, resourceCount: 0 });
    expect(result.selectedLevel?.id).toBe("level-1");
    expect(result.requestedLevelUnavailable).toBe(true);
    expect(result.requestedSubjectUnavailable).toBe(true);
  });

  it("keeps pending payments separate from acquired access", async () => {
    mocks.paymentFindMany.mockResolvedValue([{ id: "payment-7", levelId: "level-7" }]);
    const result = await getStudentExploreData({ requestedLevelId: "level-7" });

    expect(result.selectedLevel?.access).toMatchObject({ status: "PENDING", pendingPaymentId: "payment-7" });
    expect(mocks.paymentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: [PaymentStatus.INITIALIZING, PaymentStatus.PROCESSING, PaymentStatus.REQUIRES_REVIEW] } }),
    }));
  });
});
