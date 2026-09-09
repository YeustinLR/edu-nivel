import { NextResponse } from "next/server";

import { confirmContentImage } from "@/server/content/content-images";
import { ContentUploadError } from "@/server/content/upload-errors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params;
  try {
    const result = await confirmContentImage(imageId);
    return NextResponse.json(result, {
      status: result.state === "PROCESSING" ? 202 : 200,
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
