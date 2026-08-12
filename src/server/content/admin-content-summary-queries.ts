import "server-only";

import { cache } from "react";

import { PublicationStatus } from "@/generated/prisma/enums";
import { prisma } from "@/server/db/prisma";

export type AdminContentSummary = {
  levelsConfigured: number;
  totalModules: number;
  pendingReview: {
    total: number;
    modules: number;
    resources: number;
  };
  publishedContent: {
    total: number;
    modules: number;
    resources: number;
  };
};

export const getAdminContentSummary = cache(
  async (): Promise<AdminContentSummary> => {
    const [
      levelsConfigured,
      totalModules,
      resourcesPendingReview,
      publishedModules,
      publishedResources,
    ] = await Promise.all([
      prisma.level.count(),
      prisma.module.count(),
      prisma.resource.count({
        where: { publicationStatus: PublicationStatus.IN_REVIEW },
      }),
      prisma.module.count({
        where: { publicationStatus: PublicationStatus.PUBLISHED },
      }),
      prisma.resource.count({
        where: { publicationStatus: PublicationStatus.PUBLISHED },
      }),
    ]);

    return {
      levelsConfigured,
      totalModules,
      pendingReview: {
        total: resourcesPendingReview,
        modules: 0,
        resources: resourcesPendingReview,
      },
      publishedContent: {
        total: publishedModules + publishedResources,
        modules: publishedModules,
        resources: publishedResources,
      },
    };
  },
);
