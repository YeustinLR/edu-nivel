import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSummary: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/server/payments/admin-payment-queries", () => ({
  getAdminPaymentsSummary: mocks.getSummary,
}));
vi.mock("@/modules/dashboard/components/admin/AdminUrlSearchField", () => ({
  AdminUrlSearchField: ({ label }: { label: string }) => <span>{label}</span>,
}));
vi.mock("@/modules/dashboard/components/admin/AdminUrlSelectFilter", () => ({
  AdminUrlSelectFilter: ({ label }: { label: string }) => <span>{label}</span>,
}));

import AdminPaymentsPage from "@/app/dashboard/admin/payments/page";
import { PaymentStatus, PlanCode, ProviderMode } from "@/generated/prisma/client";

const summary = {
  generatedAt: new Date("2026-09-10T18:00:00.000Z"),
  paymentMode: ProviderMode.TEST,
  metrics: {
    collectedAmountMinor: { current: 700_000, previous: 350_000, percentage: 100 },
    confirmedPayments: { current: 2, previous: 1, percentage: 100 },
    requiringReview: 1,
    failedOrCanceled: 3,
  },
  monthlyTrend: Array.from({ length: 6 }, (_, index) => ({
    monthKey: `2026-0${index + 4}`,
    start: new Date(Date.UTC(2026, index + 3, 1, 6)),
    amountMinor: index === 5 ? 700_000 : 0,
    paymentCount: index === 5 ? 2 : 0,
    current: index === 5,
  })),
  planBreakdown: Object.values(PlanCode).map((planCode) => ({
    planCode,
    amountMinor: planCode === PlanCode.STUDENT_MONTHLY ? 700_000 : 0,
    paymentCount: planCode === PlanCode.STUDENT_MONTHLY ? 2 : 0,
  })),
  history: {
    totalItems: 1,
    totalPages: 1,
    page: 1,
    pageSize: 20,
    items: [
      {
        id: "payment-review",
        status: PaymentStatus.REQUIRES_REVIEW,
        expectedAmountMinor: 350_000,
        receivedAmountMinor: 350_000,
        currency: "CRC",
        planCode: PlanCode.STUDENT_MONTHLY,
        internalReference: "internal-1",
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
  },
};

describe("admin payments page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSummary.mockResolvedValue(summary);
    mocks.redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("renders monthly collection, analytics, filters and reconciliation details", async () => {
    const html = renderToStaticMarkup(
      await AdminPaymentsPage({ searchParams: Promise.resolve({}) }),
    );

    expect(html).toContain("Cobrado este mes");
    expect(html).toContain("Cobros de los últimos seis meses");
    expect(html).toContain("Cobrado este mes por plan");
    expect(html).toContain("Datos de prueba · ONVO TEST");
    expect(html).toContain("UNSUPPORTED_PROVIDER_REVERSAL");
    expect(html).toContain("Buscar");
    expect(html).not.toMatch(/Reembolso|reembolso|refundId|Preparar devolución/i);
    expect(mocks.getSummary).toHaveBeenCalledWith(
      expect.objectContaining({ period: "90d", page: 1, pageSize: 20 }),
    );
  });

  it("redirects an out-of-range page while preserving filters", async () => {
    mocks.getSummary.mockResolvedValueOnce({
      ...summary,
      history: { ...summary.history, page: 8, totalPages: 2 },
    });

    await expect(
      AdminPaymentsPage({
        searchParams: Promise.resolve({
          q: "ana",
          status: "SUCCEEDED",
          page: "8",
        }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/dashboard/admin/payments?q=ana&status=SUCCEEDED",
    );
  });
});
