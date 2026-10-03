import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, PageHeader } from '@/components/ui';
import { JoinLiveSession } from '@/components/interactive/LiveEntry';
import { getCurrentUser } from '@/lib/pocketbase-server';

export default async function InteractiveJoinPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  const code = /^[A-Za-z0-9]{8}$/.test(codigo || '') ? codigo! : '';
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent('/interactivas' + (code ? `?codigo=${code}` : ''))}`);
  return <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-4 py-10">
    <PageHeader eyebrow="Epixum · clases interactivas" title="Participá en vivo" description="Ingresá el código que te compartió tu docente. Las pantallas avanzan junto con la clase." />
    <Card><CardContent className="space-y-5"><p className="text-sm text-[var(--color-text-muted)]">Ingresás como <strong className="text-[var(--color-on-surface)]">{user.name || user.email}</strong></p><JoinLiveSession initialCode={code} /></CardContent></Card>
    <Link href="/estudiantes" className="text-sm font-semibold text-[var(--color-primary)]">Volver al campus</Link>
  </main>;
}
