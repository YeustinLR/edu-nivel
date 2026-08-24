"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { StudentSavedResourceActionResult } from "@/modules/content/types/student-saved-resource";
import { getAuthorizedStudentResource } from "@/server/content/student-resource-access";
import { prisma } from "@/server/db/prisma";

const savedResourceInputSchema = z.object({
  resourceId: z.string().trim().min(1).max(191),
  saved: z.boolean(),
});

function revalidateStudentSavedResourceViews() {
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/saved");
}

export async function setStudentResourceSavedAction(
  input: unknown,
): Promise<StudentSavedResourceActionResult> {
  const parsed = savedResourceInputSchema.safeParse(input);
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
      message:
        access.code === "CONTENT_ACCESS_REQUIRED"
          ? "Necesitas acceso activo a este nivel."
          : "Este recurso ya no está disponible para tu cuenta.",
    };
  }

  try {
    if (parsed.data.saved) {
      await prisma.savedResource.upsert({
        where: {
          userId_resourceId: {
            userId: access.userId,
            resourceId: access.resourceId,
          },
        },
        create: { userId: access.userId, resourceId: access.resourceId },
        update: {},
      });
    } else {
      await prisma.savedResource.deleteMany({
        where: { userId: access.userId, resourceId: access.resourceId },
      });
    }
  } catch {
    return {
      status: "error",
      code: "SAVE_FAILED",
      message: "No pudimos actualizar tus guardados. Inténtalo de nuevo.",
    };
  }

  revalidateStudentSavedResourceViews();
  return { status: "success", saved: parsed.data.saved };
}
