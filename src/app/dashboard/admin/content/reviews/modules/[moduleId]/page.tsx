import { redirect } from "next/navigation";

export default async function AdminModuleReviewPage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  redirect(`/dashboard/admin/content/modules/${encodeURIComponent(moduleId)}`);
}
