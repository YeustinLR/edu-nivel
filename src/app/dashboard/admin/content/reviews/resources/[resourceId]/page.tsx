import { AdminReviewDetailPage } from "@/modules/content/components/admin/reviews/AdminReviewDetailPage";

export default async function AdminResourceReviewPage({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  return <AdminReviewDetailPage reviewId={resourceId} />;
}
