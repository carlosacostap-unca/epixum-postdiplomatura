import Link from 'next/link';
import type { ListResult } from 'pocketbase';
import type { InteractiveLesson } from '@/types';
import { inspectInteractiveMaterial, isInteractiveLessonReady } from '@/lib/interactive-material';
import { Badge, Card, CardContent, EmptyState } from '@/components/ui';

export const interactiveLinkClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]';

export function InteractiveLessonList({ result, basePath, showCourse = false }: { result: ListResult<InteractiveLesson>; basePath: string; showCourse?: boolean }) {
  if (!result.totalItems) return <EmptyState icon="interactive_space" title="Todavía no hay clases interactivas" description="Creá un borrador, importá sus pantallas y actividades y asocialo a una clase habitual." />;
  return <div className="space-y-6">
    <p className="text-sm text-[var(--color-text-muted)]">{result.totalItems} {result.totalItems === 1 ? 'clase interactiva' : 'clases interactivas'} · Materiales privados para docentes</p>
    <div className="grid gap-4 lg:grid-cols-2">{result.items.map((lesson) => {
      const material = inspectInteractiveMaterial(lesson.material).material;
      return <Card key={lesson.id}><CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2"><Badge tone={isInteractiveLessonReady(lesson) ? 'success' : 'warning'}>{isInteractiveLessonReady(lesson) ? 'Preparada' : 'Borrador'}</Badge><Badge>{material ? `${material.screens.length} pantallas` : 'Sin material válido'}</Badge></div>
        <div><Link href={`/docentes/cursos/${lesson.course}/interactivas/${lesson.id}`} className="font-headline text-xl font-bold hover:text-[var(--color-primary)]">{lesson.title}</Link>{lesson.description && <p className="mt-2 line-clamp-2 break-words text-sm text-[var(--color-on-surface-variant)]">{lesson.description}</p>}</div>
        <div className="space-y-1 text-sm text-[var(--color-text-muted)]">{showCourse && <p>{lesson.expand?.course?.title || 'Curso'}</p>}<p>{lesson.expand?.class?.title ? `Clase: ${lesson.expand.class.title}` : 'Sin clase habitual asociada'}</p></div>
        <Link href={`/docentes/cursos/${lesson.course}/interactivas/${lesson.id}/editar`} className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">Editar preparación<span className="material-symbols-outlined ml-2" aria-hidden="true">arrow_forward</span></Link>
      </CardContent></Card>;
    })}</div>
    {result.totalPages > 1 && <nav aria-label="Páginas de clases interactivas" className="flex flex-wrap items-center justify-between gap-4">
      {result.page > 1 ? <Link href={`${basePath}${basePath.includes('?') ? '&' : '?'}p=${result.page - 1}`} className="min-h-11 py-3 font-bold text-[var(--color-primary)]">Página anterior</Link> : <span />}
      <span className="text-sm">Página {result.page} de {result.totalPages}</span>
      {result.page < result.totalPages ? <Link href={`${basePath}${basePath.includes('?') ? '&' : '?'}p=${result.page + 1}`} className="min-h-11 py-3 font-bold text-[var(--color-primary)]">Página siguiente</Link> : <span />}
    </nav>}
  </div>;
}
