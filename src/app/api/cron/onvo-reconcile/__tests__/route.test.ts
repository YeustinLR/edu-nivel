import { beforeEach, describe, expect, it, vi } from "vitest";

const { envMock, reconcilePendingMock } = vi.hoisted(() => ({
  envMock: {
    CRON_SECRET: "cron_secret_at_least_16_chars",
  } as { CRON_SECRET?: string },
  reconcilePendingMock: vi.fn(),
}));

vi.mock("@/config/env", () => ({ env: envMock }));
vi.mock("@/server/payments/onvo/reconcile-pending", () => ({
  reconcilePendingOnvoPayments: reconcilePendingMock,
}));
vi.mock("@/server/content/revalidate-content", () => ({
  revalidatePaymentAccessPages: vi.fn(),
}));

import { GET } from "@/app/api/cron/onvo-reconcile/route";

function request(secret?: string) {
  const headers = new Headers();
  if (secret) headers.set("authorization", `Bearer ${secret}`);
  return new Request("http://localhost/api/cron/onvo-reconcile", { headers });
}

describe("GET /api/cron/onvo-reconcile", () => {
  beforeEach(() => {
    envMock.CRON_SECRET = "cron_secret_at_least_16_chars";
    reconcilePendingMock.mockReset().mockResolvedValue({
      selected: 1,
      succeeded: 1,
      processing: 0,
      terminal: 0,
      review: 0,
      alreadyApplied: 0,
      failed: 0,
    });
  });

  it("stays disabled without a configured secret", async () => {
    envMock.CRON_SECRET = undefined;

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enabled: false });
    expect(reconcilePendingMock).not.toHaveBeenCalled();
  });

  it("rejects missing and incorrect bearer credentials", async () => {
    for (const secret of [undefined, "wrong-secret"]) {
      const response = await GET(request(secret));
      expect(response.status).toBe(401);
    }
    expect(reconcilePendingMock).not.toHaveBeenCalled();
  });

  it("runs reconciliation with the configured credential", async () => {
    const response = await GET(request("cron_secret_at_least_16_chars"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      enabled: true,
      summary: expect.objectContaining({
        selected: 1,
        succeeded: 1,
        failed: 0,
      }),
    });
  });

  it("returns 500 when any item could not be reconciled", async () => {
    reconcilePendingMock.mockResolvedValue({
      selected: 1,
      succeeded: 0,
      processing: 0,
      terminal: 0,
      review: 0,
      alreadyApplied: 0,
      failed: 1,
    });

    const response = await GET(request("cron_secret_at_least_16_chars"));

    expect(response.status).toBe(500);
  });
});
