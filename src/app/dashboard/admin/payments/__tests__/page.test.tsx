import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSummaryMock = vi.hoisted(() => vi.fn());

vi.mock("@/server/payments/admin-payment-queries", () => ({
  getAdminPaymentsSummary: getSummaryMock,
}));

import AdminPaymentsPage from "@/app/dashboard/admin/payments/page";
import { ProviderMode, PaymentStatus } from "@/generated/prisma/client";

describe("admin payments page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSummaryMock.mockResolvedValue({
      generatedAt: new Date("2026-09-10T18:00:00.000Z"),
      paymentMode: ProviderMode.TEST,
      counts: { confirmed: 1, requiringReview: 1, failedOrCanceled: 0 },
      payments: [
        {
          id: "payment-review",
          status: PaymentStatus.REQUIRES_REVIEW,
          expectedAmountMinor: 350_000,
          receivedAmountMinor: 350_000,
          currency: "CRC",
          planCode: "STUDENT_MONTHLY",
          providerStatus: "refunded",
          providerPaymentIntentId: "pi_1",
          errorCode: "UNSUPPORTED_PROVIDER_REVERSAL",
          errorMessage: "ONVO reportó un estado financiero no admitido.",
          createdAt: new Date("2026-09-10T17:00:00.000Z"),
          appliedAt: new Date("2026-09-10T17:01:00.000Z"),
          user: { name: "Ana Admin", email: "ana@example.com" },
          level: { levelNumber: 7 },
        },
      ],
    });
  });

  it("does not expose refund controls or forms", async () => {
    const html = renderToStaticMarkup(await AdminPaymentsPage());

    expect(html).not.toMatch(/Reembolso|reembolso|refundId|Preparar devolución/i);
    expect(html).not.toContain("<form");
    expect(html).toContain("UNSUPPORTED_PROVIDER_REVERSAL");
    expect(html).toContain("Datos de prueba · ONVO TEST");
  });
});
