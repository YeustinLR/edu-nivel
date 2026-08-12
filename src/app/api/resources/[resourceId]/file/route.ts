import { NextResponse } from "next/server";

import {
  ContentAudience,
  PublicationStatus,
  ResourceType,
  Role,
} from "@/generated/prisma/client";
import { getPremiumAccessDecision, requireUser } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";
import {
  createPresignedDownloadUrl,
  isR2UploadEnabled,
} from "@/server/storage/r2";

function audienceAllowsRole(audience: ContentAudience, role: Role) {
  if (role === Role.COLLABORATOR || role === Role.ADMIN) return true;

  return (
    audience === ContentAudience.BOTH ||
    (audience === ContentAudience.STUDENT && role === Role.STUDENT) ||
    (audience === ContentAudience.TEACHER && role === Role.TEACHER)
  );
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
    include: {
      pdfResource: true,
      imageResource: true,
      fileResource: true,
      audioResource: true,
      module: {
        include: {
          subject: { include: { level: true } },
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
