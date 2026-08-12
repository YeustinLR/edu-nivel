import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { PublicationStatus } from "@/generated/prisma/enums";
import type { AdminReviewFilters } from "@/server/content/admin-review-query-types";

export function getModuleReviewWhere({
  query,
  authorId,
  audience,
}: AdminReviewFilters) {
  return {
    publicationStatus: PublicationStatus.IN_REVIEW,
    createdById: authorId,
    audience,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            {
              description: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.ModuleWhereInput;
}

export function getResourceReviewWhere({
  query,
  authorId,
  audience,
  resourceType,
}: AdminReviewFilters) {
  return {
    publicationStatus: PublicationStatus.IN_REVIEW,
    createdById: authorId,
    type: resourceType,
    module: audience ? { audience } : undefined,
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            {
              description: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              module: {
                title: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.ResourceWhereInput;
}
