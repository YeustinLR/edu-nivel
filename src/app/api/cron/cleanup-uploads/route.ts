import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { cleanupExpiredUploads } from "@/server/content/cleanup-uploads";
import { cleanupExpiredContentImages } from "@/server/content/cleanup-content-images";
import { isR2UploadEnabled } from "@/server/storage/r2";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (
    !env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!isR2UploadEnabled()) {
    return NextResponse.json(
      { error: "R2_UPLOADS_DISABLED" },
      { status: 503 },
    );
  }

  const [resourceUploads, contentImages] = await Promise.all([
    cleanupExpiredUploads(),
    cleanupExpiredContentImages(),
  ]);
  return NextResponse.json({ ok: true, resourceUploads, contentImages });
}
