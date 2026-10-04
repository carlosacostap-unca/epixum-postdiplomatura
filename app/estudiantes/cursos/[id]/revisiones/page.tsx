import { ReviewsPage } from '@/components/reviews/ReviewPages';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewsPage courseId={id} mode="student" />;
}
