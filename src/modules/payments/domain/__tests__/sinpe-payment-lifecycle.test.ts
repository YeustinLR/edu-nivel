import { describe, expect, it } from "vitest";

import {
  isStaleSinpePayment,
  SINPE_STALE_AFTER_MS,
} from "@/modules/payments/domain/sinpe-payment-lifecycle";

const now = new Date("2026-07-23T18:00:00.000Z");

describe("isStaleSinpePayment", () => {
  it("keeps a recent processing payment active", () => {
    expect(
      isStaleSinpePayment(
        {
          status: "PROCESSING",
          createdAt: new Date(now.getTime() - SINPE_STALE_AFTER_MS + 1),
        },
        now,
      ),
    ).toBe(false);
  });

  it("marks an old pending payment without calling it failed", () => {
    expect(
      isStaleSinpePayment(
        {
          status: "PROCESSING",
          createdAt: new Date(now.getTime() - SINPE_STALE_AFTER_MS),
        },
        now,
      ),
    ).toBe(true);
  });

  it("honors a persisted stale marker but ignores terminal payments", () => {
    expect(
      isStaleSinpePayment(
        {
          status: "INITIALIZING",
          createdAt: now,
          staleAt: now,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isStaleSinpePayment(
        {
          status: "SUCCEEDED",
          createdAt: new Date("2020-01-01T00:00:00.000Z"),
          staleAt: now,
        },
        now,
      ),
    ).toBe(false);
  });
});
