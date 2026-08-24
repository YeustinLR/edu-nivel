import { NextResponse } from "next/server";

import { getCurrentSession } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const session = await getCurrentSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const { paymentId } = await params;
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      userId: session.user.id,
    },
    select: {
      status: true,
    },
  });

  if (!payment) {
    return NextResponse.json(
      { error: "PAYMENT_NOT_FOUND" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(payment, { headers: NO_STORE_HEADERS });
}
