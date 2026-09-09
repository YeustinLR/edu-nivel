import "server-only";

import { UploadStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { deleteR2Object } from "@/server/storage/r2";

const BATCH_SIZE = 50;
const PROCESSING_TIMEOUT_MS = 30 * 60 * 1_000;
const CLEANUP_LEASE_MS = 5 * 60 * 1_000;

export async function cleanupExpiredContentImages() {
  const now = new Date();
  const staleProcessingAt = new Date(now.getTime() - PROCESSING_TIMEOUT_MS);
  const candidates = await prisma.contentImage.findMany({
    where: {
      OR: [
        {
          resources: { none: {} },
          status: { in: [UploadStatus.PENDING, UploadStatus.FAILED, UploadStatus.EXPIRED] },
          uploadExpiresAt: { lte: now },
        },
        {
          resources: { none: {} },
          status: { in: [UploadStatus.CONFIRMED, UploadStatus.CLEANUP_PENDING] },
          orphanExpiresAt: { lte: now },
        },
        {
          status: UploadStatus.CLEANUP_PENDING,
        },
        {
          resources: { none: {} },
          status: UploadStatus.PROCESSING,
          processingStartedAt: { lte: staleProcessingAt },
        },
      ],
      AND: [
        {
          OR: [
            { cleanupLeaseUntil: null },
            { cleanupLeaseUntil: { lt: now } },
          ],
        },
      ],
    },
    orderBy: { uploadExpiresAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true },
  });

  const summary = { examined: candidates.length, cleaned: 0, failed: 0, skipped: 0 };
  for (const candidate of candidates) {
    const claimed = await prisma.contentImage.updateMany({
      where: {
        id: candidate.id,
        OR: [
          { cleanupLeaseUntil: null },
          { cleanupLeaseUntil: { lt: new Date() } },
        ],
      },
      data: {
        cleanupLeaseUntil: new Date(Date.now() + CLEANUP_LEASE_MS),
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });
    if (claimed.count !== 1) {
      summary.skipped += 1;
      continue;
    }

    const image = await prisma.contentImage.findUnique({
      where: { id: candidate.id },
      include: { resources: { take: 1, select: { resourceId: true } } },
    });
    if (!image) {
      summary.skipped += 1;
      continue;
    }

    try {
      await deleteR2Object(image.temporaryStorageKey);
      if (
        image.status === UploadStatus.CLEANUP_PENDING &&
        (image.resources.length > 0 ||
          (image.orphanExpiresAt !== null &&
            image.orphanExpiresAt > new Date()))
      ) {
        await prisma.contentImage.update({
          where: { id: image.id },
          data: {
            status: UploadStatus.CONFIRMED,
            cleanupLeaseUntil: null,
            failureCode: null,
          },
        });
        summary.cleaned += 1;
        continue;
      }
      if (image.resources.length) {
        await prisma.contentImage.update({
          where: { id: image.id },
          data: { cleanupLeaseUntil: null },
        });
        summary.skipped += 1;
        continue;
      }
      await deleteR2Object(image.storageKey);
      await prisma.contentImage.delete({ where: { id: image.id } });
      summary.cleaned += 1;
    } catch {
      await prisma.contentImage.updateMany({
        where: { id: image.id },
        data: {
          status:
            image.status === UploadStatus.CLEANUP_PENDING
              ? UploadStatus.CLEANUP_PENDING
              : UploadStatus.FAILED,
          cleanupLeaseUntil: null,
          processingStartedAt: null,
          failureCode: "R2_CLEANUP_FAILED",
        },
      });
      summary.failed += 1;
    }
  }
  return summary;
}
