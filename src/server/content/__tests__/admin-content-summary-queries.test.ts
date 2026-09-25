import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  levelCount: vi.fn(),
  moduleCount: vi.fn(),
  resourceCount: vi.fn(),
  revisionCount: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    level: { count: mocks.levelCount },
    module: { count: mocks.moduleCount },
    resource: { count: mocks.resourceCount },
    contentRevision: { count: mocks.revisionCount },
  },
}));

import { getAdminContentSummary } from "@/server/content/admin-content-summary-queries";

describe("admin content summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.levelCount.mockResolvedValue(6);
    mocks.moduleCount
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(8);
    mocks.resourceCount
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(20);
    mocks.revisionCount
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
  });

  it("includes both modules and resources in the editorial queue", async () => {
    const result = await getAdminContentSummary();

    expect(result.pendingReview).toEqual({
      total: 8,
      modules: 3,
      resources: 5,
    });
    expect(mocks.revisionCount).toHaveBeenNthCalledWith(1, {
      where: { kind: "MODULE", status: "IN_REVIEW" },
    });
    expect(mocks.revisionCount).toHaveBeenNthCalledWith(2, {
      where: { kind: "RESOURCE", status: "IN_REVIEW" },
    });
    expect(mocks.moduleCount).toHaveBeenNthCalledWith(2, {
      where: { publicationStatus: "IN_REVIEW" },
    });
    expect(mocks.moduleCount).toHaveBeenNthCalledWith(3, {
      where: {
        isActive: true,
        publicationStatus: "PUBLISHED",
        subject: { isActive: true, level: { isActive: true } },
      },
    });
    expect(mocks.resourceCount).toHaveBeenNthCalledWith(2, {
      where: {
        isActive: true,
        publicationStatus: "PUBLISHED",
        module: {
          isActive: true,
          publicationStatus: "PUBLISHED",
          subject: { isActive: true, level: { isActive: true } },
        },
      },
    });
  });
});
