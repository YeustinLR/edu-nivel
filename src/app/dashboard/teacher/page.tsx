import { Role } from "@/generated/prisma/enums";
import { TeacherDashboardHome } from "@/modules/dashboard/components/teacher/TeacherDashboardHome";
import { getLearnerDashboardData } from "@/server/content/learner-dashboard-queries";

export default async function TeacherDashboardPage() {
  const data = await getLearnerDashboardData(Role.TEACHER);
  return <TeacherDashboardHome data={data} />;
}
