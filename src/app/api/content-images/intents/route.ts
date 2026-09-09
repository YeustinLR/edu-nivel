import { NextResponse } from "next/server";

import { createContentImageIntentSchema } from "@/modules/content/schemas/content-image.schema";
import { createContentImageIntent } from "@/server/content/content-images";
import { ContentUploadError } from "@/server/content/upload-errors";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = createContentImageIntentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_IMAGE_DATA", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await createContentImageIntent(parsed.data), {
      status: 201,
    });
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
