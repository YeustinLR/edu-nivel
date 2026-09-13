import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findMany: vi.fn(),
  groupBy: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/config/env", () => ({ env: { ONVO_ENV: "live" } }));
vi.mock("@/server/auth/guards", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/server/db/prisma", () => ({
  prisma: { payment: { findMany: mocks.findMany, groupBy: mocks.groupBy } },
}));

import { PaymentStatus, ProviderMode, Role } from "@/generated/prisma/client";
import { getAdminPaymentsSummary } from "@/server/payments/admin-payment-queries";

describe("admin payment queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "admin" });
    mocks.findMany.mockResolvedValue([]);
    mocks.groupBy.mockResolvedValue([]);
  });

  it("reads only operational payment statuses in the configured provider mode", async () => {
    await getAdminPaymentsSummary(new Date("2026-09-10T18:00:00.000Z"));

    expect(mocks.requireRole).toHaveBeenCalledWith(Role.ADMIN);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          providerMode: ProviderMode.LIVE,
          status: {
            in: [
              PaymentStatus.SUCCEEDED,
              PaymentStatus.REQUIRES_REVIEW,
              PaymentStatus.FAILED,
              PaymentStatus.CANCELED,
            ],
          },
        },
      }),
    );
    expect(JSON.stringify(mocks.findMany.mock.calls)).not.toContain(
      "paymentRefund",
    );
  });
});
