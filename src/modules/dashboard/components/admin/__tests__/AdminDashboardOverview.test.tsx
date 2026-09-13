import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProviderMode } from "@/generated/prisma/client";
import { AdminDashboardOverview } from "@/modules/dashboard/components/admin/AdminDashboardOverview";
import { getAdminDashboardPeriods } from "@/modules/dashboard/domain/admin-dashboard";
import type { AdminDashboardSummary } from "@/server/dashboard/admin-dashboard-queries";

const now = new Date("2026-09-10T18:00:00.000Z");

function summary(overrides?: Partial<AdminDashboardSummary>): AdminDashboardSummary {
  return {
    viewerName: "Ana",
    generatedAt: now,
    paymentMode: ProviderMode.TEST,
    periods: getAdminDashboardPeriods(now),
    attention: {
      pendingReviews: { total: 0, modules: 0, resources: 0, oldestSubmittedAt: null },
      paymentsRequiringReview: 0,
      renewalsNeedingReminder: 0,
      expiredInvitations: 0,
    },
    metrics: {
      collected: { current: 0, previous: 0 },
      paidAccesses: { current: 0, previous: null },
      newVerifiedUsers: { current: 0, previous: 0 },
      activeLearners: { current: 0, previous: 0 },
    },
    collectionTrend: [{ start: new Date("2026-09-07T06:00:00.000Z"), end: now, amountMinor: 0 }],
    contentHealth: {
      publishedModules: 0,
      publishedResources: 0,
      changesRequested: 0,
      modulesWithoutPublishedResources: 0,
      subjectsWithoutPublishedModules: 0,
    },
    ...overrides,
  };
}

describe("AdminDashboardOverview", () => {
  it("renders a useful all-clear state and identifies sandbox money", () => {
    const html = renderToStaticMarkup(<AdminDashboardOverview summary={summary()} />);

    expect(html).toContain("Todo está al día");
    expect(html).toContain("Datos de prueba · ONVO TEST");
    expect(html).toContain("Estado actual, sin histórico comparable");
    expect(html).not.toContain("Infinity");
  });

  it("links every operational issue to its resolution workspace", () => {
    const base = summary();
    const html = renderToStaticMarkup(
      <AdminDashboardOverview
        summary={{
          ...base,
          attention: {
            pendingReviews: { total: 2, modules: 1, resources: 1, oldestSubmittedAt: new Date("2026-09-08T18:00:00.000Z") },
            paymentsRequiringReview: 1,
            renewalsNeedingReminder: 1,
            expiredInvitations: 1,
          },
        }}
      />,
    );

    expect(html).toContain('href="/dashboard/admin/payments"');
    expect(html).toContain('href="/dashboard/admin/content/reviews"');
    expect(html).toContain('href="/dashboard/admin/notifications/renewals"');
    expect(html).toContain('href="/dashboard/admin/users"');
    expect(html).toContain("la más antigua espera hace 2 días");
  });
});
