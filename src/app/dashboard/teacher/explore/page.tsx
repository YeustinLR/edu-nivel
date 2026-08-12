import { Role } from "@/generated/prisma/enums";
import { LearnerContent } from "@/modules/content/components/LearnerContent";

export default function TeacherExplorePage() {
  return (
    <LearnerContent
      role={Role.TEACHER}
      presentation="learner"
      title="Explorar recursos docentes"
      description="Recorre las materias y consulta los materiales TEACHER y BOTH publicados para tu nivel."
    />
  );
}
