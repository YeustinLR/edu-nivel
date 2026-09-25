import { redirect } from "next/navigation";

export default async function StudentSettingsPage() {
  redirect("/dashboard/settings");
}
