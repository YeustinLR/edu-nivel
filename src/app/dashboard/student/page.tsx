import { StudentDashboardHome } from "@/modules/dashboard/components/student/StudentDashboardHome";
import { getStudentDashboardData } from "@/server/content/learner-dashboard-queries";

export default async function StudentDashboardPage() {
  const data = await getStudentDashboardData();
  return <StudentDashboardHome data={data} />;
}
