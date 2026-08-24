import { NextResponse } from "next/server";

import { Role } from "@/generated/prisma/enums";
import { getCurrentSession, requireUser } from "@/server/auth/guards";
import { getLearnerSearchItems } from "@/server/content/learner-search-queries";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store",
};

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const user = await requireUser();
  if (user.role !== Role.STUDENT && user.role !== Role.TEACHER) {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403, headers: NO_STORE_HEADERS },
    );
  }

  const items = await getLearnerSearchItems(user.role);
  return NextResponse.json({ items }, { headers: NO_STORE_HEADERS });
}
