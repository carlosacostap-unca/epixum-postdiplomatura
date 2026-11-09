import { ReviewEditPage } from '@/components/reviews/ReviewPages';
export default async function Page({ params }: { params: Promise<{ id: string; reviewId: string }> }) {
  const { id, reviewId } = await params;
  return <ReviewEditPage courseId={id} reviewId={reviewId} />;
}
