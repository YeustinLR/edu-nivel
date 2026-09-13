import "server-only";

import { prisma } from "@/server/db/prisma";
import { deleteR2Object } from "@/server/storage/r2";

const CLEANUP_BATCH_SIZE = 50;

async function storageKeyIsReferenced(storageKey: string) {
  const uploadIntent = await prisma.uploadIntent.findFirst({
    where: {
      OR: [{ temporaryStorageKey: storageKey }, { permanentStorageKey: storageKey }],
    },
    select: { id: true },
  });
  if (uploadIntent) return true;

  const resource = await prisma.resource.findFirst({
    where: {
      OR: [
        { pdfResource: { storageKey } },
        { fileResource: { storageKey } },
        { imageResource: { storageKey } },
        { audioResource: { storageKey } },
      ],
    },
    select: { id: true },
  });
  if (resource) return true;

  const contentImage = await prisma.contentImage.findFirst({
    where: {
      OR: [{ temporaryStorageKey: storageKey }, { storageKey }],
    },
    select: { id: true },
  });
  return Boolean(contentImage);
}

export async function cleanupQueuedStorageObjects(storageKeys?: string[]) {
  const tasks = await prisma.storageObjectCleanup.findMany({
    where: storageKeys?.length ? { storageKey: { in: storageKeys } } : undefined,
    orderBy: { createdAt: "asc" },
    take: CLEANUP_BATCH_SIZE,
  });
  const summary = { examined: tasks.length, cleaned: 0, retained: 0, failed: 0 };

  for (const task of tasks) {
    try {
      if (await storageKeyIsReferenced(task.storageKey)) {
        await prisma.storageObjectCleanup.deleteMany({ where: { id: task.id } });
        summary.retained += 1;
        continue;
      }

      await deleteR2Object(task.storageKey);
      await prisma.storageObjectCleanup.deleteMany({ where: { id: task.id } });
      summary.cleaned += 1;
    } catch (error) {
      await prisma.storageObjectCleanup.updateMany({
        where: { id: task.id },
        data: {
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
          lastError: error instanceof Error ? error.message.slice(0, 500) : "UNKNOWN_ERROR",
        },
      });
      summary.failed += 1;
    }
  }

  return summary;
}
