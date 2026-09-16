import { notFound, redirect } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/server/auth/guards";
import { prisma } from "@/server/db/prisma";

export default async function CollaboratorModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const [{ moduleId }] = await Promise.all([params, requireRole(Role.COLLABORATOR)]);
  const moduleRecord = await prisma.module.findUnique({ where: { id: moduleId }, select: { subjectId: true } });
  if (!moduleRecord) notFound();
  redirect(`/dashboard/collaborator/content/subjects/${encodeURIComponent(moduleRecord.subjectId)}?module=${encodeURIComponent(moduleId)}`);
}
