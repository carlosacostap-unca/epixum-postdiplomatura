import { notFound } from 'next/navigation';
import { LiveRoom } from '@/components/interactive/LiveRoom';
import { createServerClient } from '@/lib/pocketbase-server';
import { readLiveState } from '@/lib/live-interactive';

export default async function TeacherLivePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  let state;
  try { state = await readLiveState(await createServerClient(), sessionId); }
  catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && [403, 404].includes(Number(error.status))) notFound();
    throw error;
  }
  if (state.role !== 'teacher') notFound();
  return <div className="page-container"><LiveRoom initial={state} /></div>;
}
