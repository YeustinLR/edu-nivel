"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  StudentResourceProgressActionResult,
  StudentResourceViewActionResult,
} from "@/modules/content/types/student-resource-progress";
import { getAuthorizedStudentResource } from "@/server/content/student-resource-access";
import { prisma } from "@/server/db/prisma";

const resourceIdSchema = z.string().trim().min(1).max(191);
const completionInputSchema = z.object({
  resourceId: resourceIdSchema,
  completed: z.boolean(),
});

function progressErrorMessage(
  code: "CONTENT_ACCESS_REQUIRED" | "RESOURCE_UNAVAILABLE",
) {
  return code === "CONTENT_ACCESS_REQUIRED"
    ? "Necesitas acceso activo a este nivel."
    : "Este recurso ya no está disponible para tu cuenta.";
}

export async function recordStudentResourceViewedAction(
  input: unknown,
): Promise<StudentResourceViewActionResult> {
  const parsed = resourceIdSchema.safeParse(input);
  if (!parsed.success) return { status: "error", code: "INVALID_INPUT" };

  const access = await getAuthorizedStudentResource(parsed.data);
  if (!access.allowed) {
    return { status: "error", code: access.code };
  }

  try {
    const now = new Date();
    await prisma.resourceProgress.upsert({
      where: {
        userId_resourceId: {
          userId: access.userId,
          resourceId: access.resourceId,
        },
      },
      create: {
        userId: access.userId,
        resourceId: access.resourceId,
        lastViewedAt: now,
      },
      update: { lastViewedAt: now },
    });
    return { status: "success" };
  } catch {
    return { status: "error", code: "PROGRESS_FAILED" };
  }
}

export async function setStudentResourceCompletedAction(
  input: unknown,
): Promise<StudentResourceProgressActionResult> {
  const parsed = completionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      code: "INVALID_INPUT",
      message: "No fue posible identificar el recurso.",
    };
  }

  const access = await getAuthorizedStudentResource(parsed.data.resourceId);
  if (!access.allowed) {
    return {
      status: "error",
      code: access.code,
      message: progressErrorMessage(access.code),
    };
  }

  try {
    const now = new Date();
    await prisma.resourceProgress.upsert({
      where: {
        userId_resourceId: {
          userId: access.userId,
          resourceId: access.resourceId,
        },
      },
      create: {
        userId: access.userId,
        resourceId: access.resourceId,
        completed: parsed.data.completed,
        completedAt: parsed.data.completed ? now : null,
        lastViewedAt: now,
      },
      update: {
        completed: parsed.data.completed,
        completedAt: parsed.data.completed ? now : null,
        lastViewedAt: now,
      },
    });
  } catch {
    return {
      status: "error",
      code: "PROGRESS_FAILED",
      message: "No pudimos actualizar tu progreso. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/content");
  revalidatePath("/dashboard/student/recent");
  return { status: "success", completed: parsed.data.completed };
}
