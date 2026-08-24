import { beforeEach, describe, expect, it, vi } from "vitest";

import { PaymentStatus } from "@/generated/prisma/enums";

const { findFirstMock, getCurrentSessionMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  getCurrentSessionMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/guards", () => ({
  getCurrentSession: getCurrentSessionMock,
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    payment: {
      findFirst: findFirstMock,
    },
  },
}));

import { GET } from "@/app/api/payments/[paymentId]/status/route";

const request = new Request(
  "http://localhost/api/payments/payment-1/status",
);
const params = { params: Promise.resolve({ paymentId: "payment-1" }) };

describe("GET /api/payments/[paymentId]/status", () => {
  beforeEach(() => {
    getCurrentSessionMock.mockReset().mockResolvedValue({
      user: { id: "user-1" },
    });
    findFirstMock.mockReset().mockResolvedValue({
      status: PaymentStatus.PROCESSING,
    });
  });

  it("returns only the local payment status to its owner", async () => {
    const response = await GET(request, params);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      status: PaymentStatus.PROCESSING,
    });
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "payment-1", userId: "user-1" },
      select: { status: true },
    });
  });

  it("returns 404 without exposing a payment owned by another user", async () => {
    findFirstMock.mockResolvedValue(null);

    const response = await GET(request, params);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "PAYMENT_NOT_FOUND" });
  });

  it("rejects unauthenticated requests before querying payments", async () => {
    getCurrentSessionMock.mockResolvedValue(null);

    const response = await GET(request, params);

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});
