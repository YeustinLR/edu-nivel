import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { reconcilePendingOnvoPayments } from "@/server/payments/onvo/reconcile-pending";
import { revalidatePaymentAccessPages } from "@/server/content/revalidate-content";

export const runtime = "nodejs";

function authorizationMatches(received: string | null, secret: string): boolean {
  const receivedDigest = createHash("sha256")
    .update(received ?? "")
    .digest();
  const expectedDigest = createHash("sha256")
    .update(`Bearer ${secret}`)
    .digest();

  return timingSafeEqual(receivedDigest, expectedDigest);
}

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ enabled: false });
  }

  if (
    !authorizationMatches(
      request.headers.get("authorization"),
      env.CRON_SECRET,
    )
  ) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const summary = await reconcilePendingOnvoPayments();
  if (
    summary.succeeded > 0 ||
    summary.alreadyApplied > 0 ||
    summary.refundSucceeded > 0 ||
    summary.refundAlreadyApplied > 0
  ) {
    revalidatePaymentAccessPages();
  }

  return NextResponse.json(
    { enabled: true, summary },
    { status: summary.failed > 0 ? 500 : 200 },
  );
}
