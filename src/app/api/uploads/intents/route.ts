import { NextResponse } from "next/server";

import { createUploadIntentSchema } from "@/modules/content/schemas/upload-intent.schema";
import { createContentUploadIntent } from "@/server/content/create-upload-intent";
import { ContentUploadError } from "@/server/content/upload-errors";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = createUploadIntentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_UPLOAD_DATA", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await createContentUploadIntent(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ContentUploadError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status },
      );
    }

    throw error;
  }
}
