import { Role } from "@/generated/prisma/enums";
import { LearnerContent } from "@/modules/content/components/LearnerContent";

export default function StudentContentPage() {
  return <LearnerContent role={Role.STUDENT} presentation="learner" />;
}
