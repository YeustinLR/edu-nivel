import { NextResponse } from "next/server";

import {
  ContentAudience,
  PublicationStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/client";
import { getPremiumAccessDecision, requireUser } from "@/server/auth/guards";
import { audienceAllowsLearnerRole } from "@/server/content/learner-content-access";
import { prisma } from "@/server/db/prisma";
import {
  createPresignedDownloadUrl,
  isR2UploadEnabled,
} from "@/server/storage/r2";

function audienceAllowsRole(audience: ContentAudience, role: Role) {
  if (role === Role.COLLABORATOR || role === Role.ADMIN) return true;
  return audienceAllowsLearnerRole(audience, role);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resourceId: string }> },
) {
  if (!isR2UploadEnabled()) {
    return NextResponse.json(
      { error: "R2_DOWNLOADS_DISABLED" },
      { status: 503 },
    );
  }

  const user = await requireUser();
  const { resourceId } = await params;
  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      type: true,
      createdById: true,
      publicationStatus: true,
      isActive: true,
      pdfResource: {
        select: {
          storageKey: true,
          originalName: true,
          mimeType: true,
        },
      },
      imageResource: {
        select: {
          storageKey: true,
          originalName: true,
          mimeType: true,
        },
      },
      fileResource: {
        select: {
          storageKey: true,
          originalName: true,
          mimeType: true,
        },
      },
      audioResource: {
        select: {
          storageKey: true,
          originalName: true,
          mimeType: true,
        },
      },
      module: {
        select: {
          createdById: true,
          publicationStatus: true,
          isActive: true,
          audience: true,
          subject: {
            select: {
              isActive: true,
              level: {
                select: {
                  id: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!resource) {
    return NextResponse.json({ error: "RESOURCE_NOT_FOUND" }, { status: 404 });
  }

  const level = resource.module.subject.level;
  const canManage =
    user.role === Role.ADMIN ||
    (user.role === Role.COLLABORATOR &&
      (resource.createdById === user.id ||
        resource.module.createdById === user.id));

  if (!canManage) {
    const visible =
      level.isActive &&
      resource.module.subject.isActive &&
      resource.module.isActive &&
      resource.isActive &&
      resource.module.publicationStatus === PublicationStatus.PUBLISHED &&
      resource.publicationStatus === PublicationStatus.PUBLISHED &&
      audienceAllowsRole(resource.module.audience, user.role);

    if (!visible) {
      return NextResponse.json({ error: "RESOURCE_FORBIDDEN" }, { status: 403 });
    }

    if (user.role === Role.STUDENT || user.role === Role.TEACHER) {
      const { decision } = await getPremiumAccessDecision(level.id);
      if (!decision.allowed) {
        return NextResponse.json(
          { error: decision.code },
          { status: 403 },
        );
      }
    }
  }

  const stored =
    resource.type === ResourceType.PDF
      ? resource.pdfResource
      : resource.type === ResourceType.IMAGE
        ? resource.imageResource
        : resource.type === ResourceType.FILE
          ? resource.fileResource
          : resource.type === ResourceType.AUDIO
            ? resource.audioResource
            : null;

  if (!stored) {
    return NextResponse.json(
      { error: "RESOURCE_HAS_NO_FILE" },
      { status: 404 },
    );
  }

  const url = await createPresignedDownloadUrl({
    key: stored.storageKey,
    originalName: stored.originalName,
    contentType: stored.mimeType,
  });

  const response = NextResponse.redirect(url, 307);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
