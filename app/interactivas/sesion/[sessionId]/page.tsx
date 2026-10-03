import { notFound, redirect } from 'next/navigation';
import { LiveRoom } from '@/components/interactive/LiveRoom';
import { createServerClient } from '@/lib/pocketbase-server';
import { readLiveState } from '@/lib/live-interactive';

export default async function StudentLivePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const pb = await createServerClient();
  if (!pb.authStore.isValid || !pb.authStore.record) redirect(`/login?next=${encodeURIComponent(`/interactivas/sesion/${sessionId}`)}`);
  let state;
  try { state = await readLiveState(pb, sessionId); }
  catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && [403, 404].includes(Number(error.status))) notFound();
    throw error;
  }
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><LiveRoom initial={state} /></main>;
}
