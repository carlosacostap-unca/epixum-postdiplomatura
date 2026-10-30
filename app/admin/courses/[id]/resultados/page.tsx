import { OutcomeRosterPage } from '@/components/outcomes/OutcomePages';
export const dynamic = 'force-dynamic';
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  return <OutcomeRosterPage courseId={id} workspace="admin" search={await searchParams} />;
}
