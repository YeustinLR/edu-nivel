import "server-only";

import { UploadStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";
import { deleteR2Object } from "@/server/storage/r2";

const BATCH_SIZE = 50;
const PROCESSING_TIMEOUT_MS = 30 * 60 * 1_000;
const CLEANUP_LEASE_MS = 5 * 60 * 1_000;

export type UploadCleanupSummary = {
  examined: number;
  cleaned: number;
  failed: number;
  skipped: number;
};

export async function cleanupExpiredUploads(): Promise<UploadCleanupSummary> {
  const now = new Date();
  const staleProcessingAt = new Date(now.getTime() - PROCESSING_TIMEOUT_MS);
  const candidates = await prisma.uploadIntent.findMany({
    where: {
      OR: [
        {
          status: {
            in: [
              UploadStatus.PENDING,
              UploadStatus.FAILED,
              UploadStatus.EXPIRED,
            ],
          },
          expiresAt: { lte: now },
        },
        { status: UploadStatus.CLEANUP_PENDING },
        {
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
    orderBy: { expiresAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true },
  });

  const summary: UploadCleanupSummary = {
    examined: candidates.length,
    cleaned: 0,
    failed: 0,
    skipped: 0,
  };

  for (const candidate of candidates) {
    const leaseUntil = new Date(Date.now() + CLEANUP_LEASE_MS);
    const claimed = await prisma.uploadIntent.updateMany({
      where: {
        id: candidate.id,
        OR: [
          { cleanupLeaseUntil: null },
          { cleanupLeaseUntil: { lt: new Date() } },
        ],
      },
      data: {
        cleanupLeaseUntil: leaseUntil,
        lastAttemptAt: new Date(),
        attemptCount: { increment: 1 },
      },
    });

    if (claimed.count !== 1) {
      summary.skipped += 1;
      continue;
    }

    const intent = await prisma.uploadIntent.findUnique({
      where: { id: candidate.id },
      include: { resource: { select: { id: true } } },
    });

    if (!intent) {
      summary.skipped += 1;
      continue;
    }

    try {
      await deleteR2Object(intent.temporaryStorageKey);

      if (intent.resource) {
        await prisma.uploadIntent.update({
          where: { id: intent.id },
          data: {
            status: UploadStatus.CONFIRMED,
            cleanupLeaseUntil: null,
            processingStartedAt: null,
            failureCode: null,
          },
        });
      } else {
        await deleteR2Object(intent.permanentStorageKey);
        await prisma.uploadIntent.delete({ where: { id: intent.id } });
      }

      summary.cleaned += 1;
    } catch {
      await prisma.uploadIntent.updateMany({
        where: { id: intent.id },
        data: {
          status: UploadStatus.FAILED,
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
