"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import {
  createModuleSchema,
  getCreateModuleFormValues,
} from "@/modules/content/schemas/admin-content-creation.schema";
import { getPremiumAccessDecision, requireRole } from "@/server/auth/guards";
import { applyEditorialTransition } from "@/server/content/apply-editorial-transition";
import { createCatalogModule } from "@/server/content/create-catalog-content";
import {
  revalidateContentPages,
  revalidateLearnerSelectionPages,
} from "@/server/content/revalidate-content";
import { prisma } from "@/server/db/prisma";

const idSchema = z.string().trim().min(1);

export async function createModuleAction(formData: FormData) {
  const user = await requireRole([Role.ADMIN, Role.COLLABORATOR]);
  const parsed = createModuleSchema.parse(
    getCreateModuleFormValues(formData),
  );

  const moduleRecord = await createCatalogModule(parsed, user.id, user.role);
  revalidateContentPages(
    moduleRecord.publicationStatus === "PUBLISHED" ? "published" : "authoring",
  );
  redirect(
    user.role === Role.ADMIN
      ? `/dashboard/admin/content/modules/${encodeURIComponent(moduleRecord.id)}`
      : "/dashboard/collaborator/content",
  );
}

export async function selectLevelAction(formData: FormData) {
  const user = await requireRole([Role.STUDENT, Role.TEACHER]);
  const levelId = idSchema.parse(formData.get("levelId"));
  const [level, access] = await Promise.all([
    prisma.level.findUnique({
      where: { id: levelId },
      select: { isActive: true },
    }),
    getPremiumAccessDecision(levelId),
  ]);

  if (!level || (!level.isActive && !access.decision.allowed)) {
    throw new Error("Este nivel no está disponible para tu cuenta.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { selectedLevelId: levelId },
  });
  revalidateLearnerSelectionPages(user.role);
  const requestedReturnTo = formData.get("returnTo");
  const roleRoot =
    user.role === Role.STUDENT
      ? "/dashboard/student"
      : "/dashboard/teacher";
  const allowedReturnPaths = new Set([roleRoot, `${roleRoot}/content`]);
  const returnTo =
    typeof requestedReturnTo === "string" &&
    allowedReturnPaths.has(requestedReturnTo)
      ? requestedReturnTo
      : roleRoot;
  redirect(returnTo);
}

export async function enterStudentLevelAction(formData: FormData) {
  await requireRole(Role.STUDENT);
  const levelId = idSchema.parse(formData.get("levelId"));
  const [level, access] = await Promise.all([
    prisma.level.findUnique({
      where: { id: levelId },
      select: { isActive: true },
    }),
    getPremiumAccessDecision(levelId),
  ]);

  if (!level || (!level.isActive && !access.decision.allowed)) {
    const errorCode = access.decision.allowed
      ? "SUBSCRIPTION_REQUIRED"
      : access.decision.code;
    redirect(
      `/dashboard/student/explore?level=${encodeURIComponent(levelId)}&error=${encodeURIComponent(errorCode)}`,
    );
  }

  await prisma.user.update({
    where: { id: access.user.id },
    data: { selectedLevelId: levelId },
  });
  revalidateLearnerSelectionPages(Role.STUDENT);
  redirect("/dashboard/student/content");
}

export async function submitForReviewAction(formData: FormData) {
  const user = await requireRole([Role.ADMIN, Role.COLLABORATOR]);
  const type = z.enum(["module", "resource"]).parse(formData.get("type"));
  const id = idSchema.parse(formData.get("id"));

  const transition = await applyEditorialTransition({
    targetType: type,
    targetId: id,
    transition: "SUBMIT_FOR_REVIEW",
    actor: user,
  });
  revalidateContentPages(
    transition.publicationStatus === "PUBLISHED" ? "published" : "authoring",
  );
}

export async function withdrawReviewAction(formData: FormData) {
  const user = await requireRole([Role.ADMIN, Role.COLLABORATOR]);
  const type = z.enum(["module", "resource"]).parse(formData.get("type"));
  const id = idSchema.parse(formData.get("id"));

  const transition = await applyEditorialTransition({
    targetType: type,
    targetId: id,
    transition: "WITHDRAW_REVIEW",
    actor: user,
  });
  revalidateContentPages(
    transition.publicationStatus === "PUBLISHED" ? "published" : "authoring",
  );
}

export async function publishDirectAction(formData: FormData) {
  const user = await requireRole([Role.ADMIN, Role.COLLABORATOR]);
  const type = z.enum(["module", "resource"]).parse(formData.get("type"));
  const id = idSchema.parse(formData.get("id"));

  await applyEditorialTransition({
    targetType: type,
    targetId: id,
    transition: "PUBLISH_DIRECT",
    actor: user,
  });
  revalidateContentPages("published");
}
