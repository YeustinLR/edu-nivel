import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  levelCount: vi.fn(),
  moduleCount: vi.fn(),
  resourceCount: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    level: { count: mocks.levelCount },
    module: { count: mocks.moduleCount },
    resource: { count: mocks.resourceCount },
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
  });

  it("includes both modules and resources in the editorial queue", async () => {
    const result = await getAdminContentSummary();

    expect(result.pendingReview).toEqual({
      total: 5,
      modules: 2,
      resources: 3,
    });
    expect(mocks.moduleCount).toHaveBeenNthCalledWith(2, {
      where: { publicationStatus: "IN_REVIEW" },
    });
  });
});
