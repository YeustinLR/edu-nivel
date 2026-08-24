import "server-only";

import { revalidatePath, updateTag } from "next/cache";
import { Role } from "@/generated/prisma/enums";
import { PUBLISHED_ACADEMIC_CATALOG_TAGS } from "@/server/content/academic-catalog-cache";

type ContentRevalidationScope = "authoring" | "published";

export function revalidateContentPages(
  scope: ContentRevalidationScope = "authoring",
) {
  revalidatePath("/dashboard/admin/content", "layout");
  revalidatePath("/dashboard/collaborator/content", "layout");

  if (scope !== "published") return;

  for (const tag of PUBLISHED_ACADEMIC_CATALOG_TAGS) {
    updateTag(tag);
  }

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/content");
  revalidatePath("/dashboard/student/explore");
  revalidatePath("/dashboard/teacher");
  revalidatePath("/dashboard/teacher/content");
  revalidatePath("/dashboard/teacher/explore");
}

export function revalidateLearnerSelectionPages(role: Role) {
  const learnerPath =
    role === Role.STUDENT ? "/dashboard/student" : "/dashboard/teacher";

  revalidatePath(learnerPath, "layout");
  revalidatePath("/dashboard/subscription");
}

export function revalidatePaymentAccessPages() {
  revalidatePath("/dashboard/subscription");
  revalidatePath("/dashboard/student", "layout");
  revalidatePath("/dashboard/student/explore");
  revalidatePath("/dashboard/student/content");
  revalidatePath("/dashboard/teacher", "layout");
  revalidatePath("/dashboard/teacher/content");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/payments");
}
