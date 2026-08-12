import { Role } from "@/generated/prisma/enums";
import { LearnerContent } from "@/modules/content/components/LearnerContent";

export default function TeacherContentPage() {
  return (
    <LearnerContent
      role={Role.TEACHER}
      presentation="learner"
      title="Materias para enseñar"
      description="Consulta los módulos y recursos publicados para docentes en tu nivel actual."
    />
  );
}
