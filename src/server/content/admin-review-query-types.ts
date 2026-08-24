import type {
  ContentAudience,
  ResourceType,
} from "@/generated/prisma/enums";
import type { AdminReviewKind } from "@/modules/content/schemas/admin-reviews.schema";

export type AdminReviewFilters = {
  kind: AdminReviewKind;
  query: string;
  authorId?: string;
  audience?: ContentAudience;
  resourceType?: ResourceType;
  page: number;
  pageSize: number;
};

export type AdminReviewQueueItem = {
  id: string;
  kind: AdminReviewKind;
  title: string;
  context: string;
  audience: ContentAudience;
  resourceType: ResourceType | null;
  authorName: string;
  submittedAt: Date | null;
  updatedAt: Date;
  resourceCount: number | null;
};

export type AdminReviewAuthorOption = {
  id: string;
  name: string;
};

export type AdminReviewQueue = {
  items: AdminReviewQueueItem[];
  authors: AdminReviewAuthorOption[];
  totalItems: number;
  totalPages: number;
  page: number;
  pageSize: number;
};

export type AdminReviewDetail = AdminReviewQueueItem & {
  description: string | null;
  instructions: string | null;
  parentId: string;
  previousId: string | null;
  nextId: string | null;
};
