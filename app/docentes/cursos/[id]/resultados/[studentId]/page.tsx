import { OutcomeDetailPage } from '@/components/outcomes/OutcomePages';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ id: string; studentId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id, studentId } = await params; const search = await searchParams;
  return <OutcomeDetailPage courseId={id} studentId={studentId} workspace="teacher" historyPage={search.historial} />;
}
