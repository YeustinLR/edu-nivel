import "server-only";

import { revalidatePath } from "next/cache";

export function revalidateContentPages() {
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/content", "layout");
  revalidatePath("/dashboard/collaborator");
  revalidatePath("/dashboard/collaborator/content", "layout");
  revalidatePath("/dashboard/student/content");
  revalidatePath("/dashboard/student", "layout");
  revalidatePath("/dashboard/teacher/content");
}
