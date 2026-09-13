import type { Metadata } from "next";

import { Role } from "@/generated/prisma/enums";
import { LearnerContent } from "@/modules/content/components/LearnerContent";

export const metadata: Metadata = { title: "Materias" };

export default function TeacherContentPage() {
  return (
    <LearnerContent
      role={Role.TEACHER}
      presentation="learner"
      title="Materias"
      description="Consulta los materiales publicados para docentes en tu nivel actual."
    />
  );
}
