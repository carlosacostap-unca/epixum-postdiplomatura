import Link from 'next/link';
import { Badge, Card, CardContent } from '@/components/ui';
import { createServerClient } from '@/lib/pocketbase-server';
import type { LiveSession } from '@/lib/live-interactive-contract';
import { liveUser } from '@/lib/live-interactive';

export async function LiveHistory({ lessonId, page = 1 }: { lessonId?: string; page?: number }) {
  const pb = await createServerClient();
  const user = liveUser(pb);
  const result = await pb.collection('interactive_sessions').getList<LiveSession>(Number.isSafeInteger(page) && page > 0 ? page : 1, 20, {
    filter: pb.filter('course.teachers.id ?= {:user}', { user }) + (lessonId ? pb.filter(' && lesson = {:lesson}', { lesson: lessonId }) : ''),
    sort: '-created,id', fields: 'id,title,classTitle,status,created',
  });
  if (!result.totalItems) return null;
  return <section aria-label="Historial de sesiones" className="space-y-4">
    <h2 className="font-headline text-xl font-bold">Sesiones e historial</h2>
    <div className="grid gap-3 md:grid-cols-2">{result.items.map((session) => <Card key={session.id}><CardContent className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><Badge tone={session.status === 'live' ? 'success' : 'neutral'}>{session.status === 'live' ? 'En vivo' : 'Finalizada'}</Badge><span className="text-sm text-[var(--color-text-muted)]">{new Date(session.created).toLocaleString('es-AR', { timeZone: 'America/Buenos_Aires', dateStyle: 'short', timeStyle: 'short' })}</span></div>
      <Link href={`/docentes/interactivas/sesiones/${session.id}`} className="block font-bold text-[var(--color-primary)]">{session.title}</Link><p className="text-sm text-[var(--color-text-muted)]">{session.classTitle}</p>
    </CardContent></Card>)}</div>
    {!lessonId && result.totalPages > 1 && <nav aria-label="Páginas del historial" className="flex justify-between gap-3">{result.page > 1 ? <Link href={`?sesionesP=${result.page - 1}`}>Sesiones más recientes</Link> : <span />}{result.page < result.totalPages && <Link href={`?sesionesP=${result.page + 1}`}>Sesiones anteriores</Link>}</nav>}
    {lessonId && result.totalPages > 1 && <Link href="/docentes/interactivas" className="text-sm text-[var(--color-primary)]">Ver historial completo</Link>}
  </section>;
}
