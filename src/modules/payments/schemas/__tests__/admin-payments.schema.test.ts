import { describe, expect, it } from "vitest";

import { PaymentStatus, PlanCode } from "@/generated/prisma/client";
import {
  buildAdminPaymentsHref,
  parseAdminPaymentsSearchParams,
} from "@/modules/payments/schemas/admin-payments.schema";

describe("admin payment search parameters", () => {
  it("uses a bounded default period and page size", () => {
    expect(parseAdminPaymentsSearchParams({})).toEqual({
      query: "",
      status: undefined,
      plan: undefined,
      period: "90d",
      page: 1,
      pageSize: 20,
    });
  });

  it("accepts known filters and discards malformed values", () => {
    expect(
      parseAdminPaymentsSearchParams({
        q: "  Ana  ",
        status: PaymentStatus.PROCESSING,
        plan: PlanCode.TEACHER_YEARLY,
        period: "12m",
        page: "3",
      }),
    ).toMatchObject({
      query: "Ana",
      status: PaymentStatus.PROCESSING,
      plan: PlanCode.TEACHER_YEARLY,
      period: "12m",
      page: 3,
    });
    expect(
      parseAdminPaymentsSearchParams({
        status: "REFUNDED",
        plan: "UNKNOWN",
        period: "forever",
        page: "-2",
      }),
    ).toMatchObject({
      status: undefined,
      plan: undefined,
      period: "90d",
      page: 1,
    });
  });

  it("preserves active filters in pagination links", () => {
    const filters = parseAdminPaymentsSearchParams({
      q: "pi_123",
      status: PaymentStatus.SUCCEEDED,
      plan: PlanCode.STUDENT_MONTHLY,
      period: "all",
      page: "2",
    });
    expect(buildAdminPaymentsHref(filters, 3)).toBe(
      "/dashboard/admin/payments?q=pi_123&status=SUCCEEDED&plan=STUDENT_MONTHLY&period=all&page=3",
    );
  });
});
