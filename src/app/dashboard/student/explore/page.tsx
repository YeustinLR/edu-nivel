import { Role } from "@/generated/prisma/enums";
import { LearnerContent } from "@/modules/content/components/LearnerContent";

export default function StudentExplorePage() {
  return (
    <LearnerContent
      role={Role.STUDENT}
      presentation="learner"
      title="Explorar recursos"
      description="Recorre las materias y abre los recursos publicados para tu nivel actual."
    />
  );
}
