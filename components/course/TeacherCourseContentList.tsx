'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CourseContent } from '@/types';
import { deleteCourseContent, reorderCourseContents } from '@/lib/actions-course-content';
import { Button, Card, CardContent, ConfirmDialog, EmptyState, IconButton, useToast } from '@/components/ui';

export function TeacherCourseContentList({ courseId, contents }: { courseId: string; contents: CourseContent[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [movingId, setMovingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CourseContent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= contents.length) return;
    const ordered = contents.map((content) => content.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setMovingId(contents[index].id);
    const result = await reorderCourseContents(courseId, ordered);
    setMovingId(null);
    if (!result.success) {
      notify({ title: 'No se pudo cambiar el orden', description: result.error, tone: 'error' });
      return;
    }
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    const result = await deleteCourseContent(courseId, deleting.id);
    setIsDeleting(false);
    if (!result.success) {
      notify({ title: 'No se pudo eliminar', description: result.error, tone: 'error' });
      return;
    }
    setDeleting(null);
    notify({ title: 'Contenido eliminado', tone: 'success' });
    router.refresh();
  };

  if (contents.length === 0) return <EmptyState icon="library_books" title="Todavía no hay contenidos" description="Creá el primer material independiente del curso." action={<Link href={`/docentes/cursos/${courseId}/contenidos/nuevo`} className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-on-primary)]">Crear contenido</Link>} />;

  return <div className="space-y-4">{contents.map((content, index) => <Card key={content.id}><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-start gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 font-bold text-[var(--color-primary)]">{index + 1}</span><div className="min-w-0"><Link href={`/docentes/cursos/${courseId}/contenidos/${content.id}`} className="font-headline text-xl font-bold hover:text-[var(--color-primary)]">{content.title}</Link><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Posición {index + 1}</p></div></div><div className="flex flex-wrap items-center gap-2"><IconButton label={`Mover ${content.title} hacia arriba`} icon={<span className="material-symbols-outlined">arrow_upward</span>} variant="ghost" disabled={index === 0 || Boolean(movingId)} isPending={movingId === content.id} onClick={() => move(index, -1)} /><IconButton label={`Mover ${content.title} hacia abajo`} icon={<span className="material-symbols-outlined">arrow_downward</span>} variant="ghost" disabled={index === contents.length - 1 || Boolean(movingId)} isPending={movingId === content.id} onClick={() => move(index, 1)} /><Link href={`/docentes/cursos/${courseId}/contenidos/${content.id}/editar`} className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-surface-container-highest)] px-4 text-sm font-bold">Editar</Link><Button variant="ghost" onClick={() => setDeleting(content)}>Eliminar</Button></div></CardContent></Card>)}<ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} title="Eliminar contenido" description={<>Se eliminará <strong>{deleting?.title}</strong> junto con sus referencias de recursos. Esta acción no se puede deshacer.</>} confirmLabel="Eliminar contenido" tone="danger" isPending={isDeleting} onConfirm={confirmDelete} /></div>;
}
