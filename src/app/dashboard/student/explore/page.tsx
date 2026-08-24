import type { Metadata } from "next";

import { StudentExploreCatalog } from "@/modules/content/components/student-explore/StudentExploreCatalog";
import { getStudentExploreData } from "@/server/content/student-explore-queries";

export const metadata: Metadata = { title: "Explorar niveles" };

export default async function StudentExplorePage({
  searchParams,
}: {
  searchParams: Promise<{
    stage?: string;
    level?: string;
    subject?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const data = await getStudentExploreData({
    requestedStage: params.stage,
    requestedLevelId: params.level,
    requestedSubjectId: params.subject,
  });
  const catalogSelectionKey = [
    data.stage,
    data.selectedLevel?.id ?? "none",
    data.selectedSubjectId ?? "none",
  ].join(":");

  return (
    <StudentExploreCatalog
      key={catalogSelectionKey}
      data={data}
      actionError={params.error}
    />
  );
}
