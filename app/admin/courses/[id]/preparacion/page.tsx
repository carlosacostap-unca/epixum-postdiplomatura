import Link from 'next/link';
import { PreparationOverview, preparationLink } from '@/components/preparation/PreparationOverview';
import { getPreparation } from '@/lib/preparation-data';

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string; h?: string }> }) {
  const { id } = await params; const { p, h } = await searchParams;
  const data = await getPreparation(id, 'teacher', Number(p), Number(h));
  const base = `/admin/courses/${id}/preparacion`;
  return <div className="space-y-8"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-2xl font-bold">Simulaciones de parciales y exámenes</h2><p className="mt-2 text-[var(--color-text-muted)]">Configurá preguntas de opción múltiple y tiempo límite. Los alumnos podrán practicar y conocer su nota simulada.</p></div><Link className={preparationLink} href={`${base}/nueva`}>Nueva simulación</Link></div><PreparationOverview data={data} mode="teacher" basePath={base} /></div>;
}
