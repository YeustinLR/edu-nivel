import { NextResponse } from "next/server";

import { PublicationStatus, Role, UploadStatus } from "@/generated/prisma/enums";
import { getPremiumAccessDecision, requireUser } from "@/server/auth/guards";
import { audienceAllowsLearnerRole } from "@/server/content/learner-content-access";
import { prisma } from "@/server/db/prisma";
import {
  createPresignedDownloadUrl,
  isR2UploadEnabled,
} from "@/server/storage/r2";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  if (!isR2UploadEnabled()) {
    return NextResponse.json({ error: "R2_DOWNLOADS_DISABLED" }, { status: 503 });
  }

  const user = await requireUser();
  const { imageId } = await params;

  const image = await prisma.contentImage.findUnique({
    where: { id: imageId },
    select: {
      id: true,
      createdById: true,
      storageKey: true,
      originalName: true,
      mimeType: true,
      status: true,
      orphanExpiresAt: true,
      resources: {
        select: {
          resource: {
            select: {
              createdById: true,
              publicationStatus: true,
              isActive: true,
              module: {
                select: {
                  createdById: true,
                  publicationStatus: true,
                  isActive: true,
                  audience: true,
                  subject: {
                    select: {
                      isActive: true,
                      level: { select: { id: true, isActive: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    !image ||
    image.status !== UploadStatus.CONFIRMED &&
    image.status !== UploadStatus.CLEANUP_PENDING
  ) {
    return NextResponse.json({ error: "IMAGE_NOT_FOUND" }, { status: 404 });
  }

  if (!image.resources.length) {
    const stagedAccess =
      image.orphanExpiresAt !== null &&
      image.orphanExpiresAt > new Date() &&
      (user.role === Role.ADMIN || image.createdById === user.id);
    if (!stagedAccess) {
      return NextResponse.json({ error: "IMAGE_FORBIDDEN" }, { status: 403 });
    }
  } else if (user.role !== Role.ADMIN) {
    let allowed = false;
    let lastPremiumError: string | null = null;
    for (const { resource: reference } of image.resources) {
      if (
        user.role === Role.COLLABORATOR &&
        (reference.createdById === user.id ||
          reference.module.createdById === user.id)
      ) {
        allowed = true;
        break;
      }
      const visible =
        reference.isActive &&
        reference.publicationStatus === PublicationStatus.PUBLISHED &&
        reference.module.isActive &&
        reference.module.publicationStatus === PublicationStatus.PUBLISHED &&
        reference.module.subject.isActive &&
        reference.module.subject.level.isActive &&
        (user.role === Role.COLLABORATOR ||
          audienceAllowsLearnerRole(reference.module.audience, user.role));
      if (!visible) continue;
      if (user.role === Role.COLLABORATOR) {
        allowed = true;
        break;
      }
      if (user.role === Role.STUDENT || user.role === Role.TEACHER) {
        const { decision } = await getPremiumAccessDecision(
          reference.module.subject.level.id,
        );
        if (decision.allowed) {
          allowed = true;
          break;
        }
        lastPremiumError = decision.code;
      }
    }
    if (!allowed) {
      return NextResponse.json(
        { error: lastPremiumError ?? "IMAGE_FORBIDDEN" },
        { status: 403 },
      );
    }
  }

  const url = await createPresignedDownloadUrl({
    key: image.storageKey,
    originalName: image.originalName,
    contentType: image.mimeType,
  });
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
