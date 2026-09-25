import { redirect } from "next/navigation";

export default async function TeacherSettingsPage() {
  redirect("/dashboard/settings");
}
