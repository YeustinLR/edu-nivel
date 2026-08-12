import { NextResponse } from "next/server";

import { confirmContentUpload } from "@/server/content/confirm-upload";
import { ContentUploadError } from "@/server/content/upload-errors";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ uploadId: string }> },
) {
  const { uploadId } = await params;

  try {
    const result = await confirmContentUpload(uploadId);
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

