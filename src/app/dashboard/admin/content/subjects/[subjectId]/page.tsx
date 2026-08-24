import { notFound } from "next/navigation";

import { Role } from "@/generated/prisma/enums";
import { SubjectContentWorkspace } from "@/modules/content/components/admin/workspace/SubjectContentWorkspace";
import { requireRole } from "@/server/auth/guards";
import { getAdminSubjectContentWorkspace } from "@/server/content/admin-module-list-queries";
import { prisma } from "@/server/db/prisma";

export default async function AdminSubjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{
    module?: string | string[];
  }>;
}) {
  const [{ subjectId }, queryParams, actor] = await Promise.all([
    params,
    searchParams,
    requireRole(Role.ADMIN),
  ]);
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      level: { select: { id: true, levelNumber: true, isActive: true } },
    },
  });
  if (!subject) notFound();

  const modules = await getAdminSubjectContentWorkspace({
    subjectId,
    actor,
    hierarchyIsActive: subject.isActive && subject.level.isActive,
  });
  const requestedModuleId =
    typeof queryParams.module === "string" ? queryParams.module : undefined;
  const initialModuleId = modules.some((moduleRecord) => moduleRecord.id === requestedModuleId)
    ? requestedModuleId
    : undefined;
  return (
    <SubjectContentWorkspace
      subject={subject}
      modules={modules}
      now={new Date().toISOString()}
      initialModuleId={initialModuleId}
    />
  );
}
