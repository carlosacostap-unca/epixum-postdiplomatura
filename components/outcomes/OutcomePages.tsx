import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Course } from '@/types';
import { Badge, Card, CardContent, DataTable } from '@/components/ui';
import FormattedDate from '@/components/FormattedDate';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { outcomePage, readCourseOutcomeRoster, readManagedCourseOutcome, requireOutcomeCourse } from '@/lib/course-outcome-service';
import { OutcomeError, outcomeGradeLabel, outcomeHistoryLabels, outcomeLabels, type OutcomeDraft } from '@/lib/course-outcomes';
import { OutcomeEditor } from './OutcomeEditor';

type Workspace = 'teacher' | 'admin';
const baseFor = (course: string, workspace: Workspace) => workspace === 'admin' ? `/admin/courses/${course}/resultados` : `/docentes/cursos/${course}/resultados`;
function unavailable(error: unknown): never {
  if (error instanceof OutcomeError || (error && typeof error === 'object' && 'status' in error && error.status === 404)) notFound();
  throw error;
}
async function context(course: string, workspace: Workspace) {
  const pb = await createServerClient();
  await requireOutcomeCourse(pb, course);
  if (workspace === 'admin' && pb.authStore.record?.role !== 'admin') throw new OutcomeError('Acceso administrativo requerido.');
  return { pb, service: await createServiceClient() };
}
function Frame({ course, workspace, children }: { course: Course; workspace: Workspace; children: ReactNode }) {
  return <div className={workspace === 'teacher' ? 'page-container space-y-8' : 'space-y-8'}>{workspace === 'teacher' ? <TeacherCourseContext course={course} current="resultados" title="Resultados de cursada" description="Prepará y publicá el resultado final de cada alumno de forma individual." /> : <h2 className="text-2xl font-bold">Resultados de cursada</h2>}{children}</div>;
}
function pages(base: string, page: number, totalPages: number, parameter = 'page', query = '') {
  const href = (target: number) => `${base}?${new URLSearchParams({ [parameter]: String(target), ...(query ? { q: query } : {}) })}`;
  return totalPages > 1 && <nav aria-label="Paginación" className="flex flex-wrap items-center gap-5">{page > 1 && <Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={href(page - 1)}>Anterior</Link>}<span className="text-sm">Página {page} de {totalPages}</span>{page < totalPages && <Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={href(page + 1)}>Siguiente</Link>}</nav>;
}
export async function OutcomeRosterPage({ courseId, workspace, search }: { courseId: string; workspace: Workspace; search: Record<string, string | string[] | undefined> }) {
  const { pb, service } = await context(courseId, workspace).catch(unavailable);
  const data = await readCourseOutcomeRoster(pb, service, courseId, outcomePage(search.page), typeof search.q === 'string' ? search.q : '').catch(unavailable);
  const base = baseFor(courseId, workspace);
  type Row = typeof data.rows[number];
  return <Frame course={data.course} workspace={workspace}>
    <p className="text-sm text-[var(--color-on-surface-variant)]">Cada alumno ve únicamente su versión publicada. Los borradores y este listado son privados del equipo docente y la administración.</p>
    <form method="get" className="flex flex-wrap items-end gap-3"><label className="flex min-w-0 flex-1 flex-col gap-2 text-sm font-bold">Buscar alumno<input name="q" defaultValue={data.query} maxLength={100} placeholder="Nombre o email" className="rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" /></label><button type="submit" className="min-h-11 rounded-xl bg-[var(--color-primary)] px-5 py-3 font-bold text-[var(--color-on-primary)]">Buscar</button></form>
    <DataTable ariaLabel="Resultados de cursada de los alumnos" items={data.rows} getKey={row => row.student.id} columns={[
      { id: 'student', header: 'Alumno', render: (row: Row) => <div><p className="font-bold">{row.student.name || 'Sin nombre'}</p><p className="mt-1 break-all text-xs text-[var(--color-on-surface-variant)]">{row.student.email}</p></div> },
      { id: 'draft', header: 'Borrador', render: (row: Row) => row.draft ? outcomeLabels[row.draft.status] : 'Sin cargar' },
      { id: 'published', header: 'Visible para el alumno', render: (row: Row) => row.published ? <div><Badge tone="success">Publicado</Badge><p className="mt-2">{outcomeLabels[row.published.status]}{row.published.grade !== null ? ` · Nota: ${outcomeGradeLabel(row.published.grade)}` : ''}</p></div> : <Badge>Sin publicar</Badge> },
      { id: 'edit', header: 'Gestión', render: (row: Row) => <Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={`${base}/${row.student.id}`}>Gestionar resultado →</Link> },
    ]} empty={<p className="rounded-xl border border-dashed border-[var(--color-outline)] p-6">No hay alumnos matriculados que coincidan con la búsqueda.</p>} />
    {pages(base, data.page, data.totalPages, 'page', data.query)}
  </Frame>;
}
function Snapshot({ title, value }: { title: string; value: OutcomeDraft | null }) {
  return <div><h4 className="font-bold">{title}</h4>{value ? <div className="mt-2 space-y-2 text-sm"><p>{outcomeLabels[value.status]} · {value.grade === null ? 'Sin nota' : `Nota: ${outcomeGradeLabel(value.grade)}`}</p>{value.feedback && <p className="whitespace-pre-wrap break-words text-[var(--color-on-surface-variant)]">{value.feedback}</p>}</div> : <p className="mt-2 text-sm">Sin publicación</p>}</div>;
}
export async function OutcomeDetailPage({ courseId, studentId, workspace, historyPage }: { courseId: string; studentId: string; workspace: Workspace; historyPage?: unknown }) {
  const { pb, service } = await context(courseId, workspace).catch(unavailable);
  const data = await readManagedCourseOutcome(pb, service, courseId, studentId, outcomePage(historyPage)).catch(unavailable);
  const base = baseFor(courseId, workspace);
  return <Frame course={data.course} workspace={workspace}>
    <Link href={base} className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">← Resultados de cursada</Link>
    <div><h2 className="break-words text-2xl font-bold">{data.student.name || 'Alumno'}</h2><p className="mt-2 break-all text-sm text-[var(--color-on-surface-variant)]">{data.student.email}</p></div>
    <OutcomeEditor key={data.outcome?.revision || 'new'} courseId={courseId} studentId={studentId} studentName={data.student.name || 'el alumno'} outcome={data.outcome} />
    <section className="space-y-4" aria-label="Historial privado del resultado"><h2 className="text-2xl font-bold">Historial del resultado</h2><p className="text-sm text-[var(--color-on-surface-variant)]">Solo visible para el equipo docente y la administración. Se registra quién hizo cada cambio y qué versión quedó guardada o publicada.</p>
      {!data.history.items.length ? <p>Todavía no se guardó ningún resultado.</p> : data.history.items.map(entry => <Card key={entry.id}><CardContent><details><summary className="cursor-pointer font-bold">{outcomeHistoryLabels[entry.action]} · {entry.actorName} · <FormattedDate date={entry.occurredAt} showTime /></summary><div className="mt-5 grid gap-5 md:grid-cols-2"><Snapshot title="Borrador guardado" value={entry.snapshot.draft} /><Snapshot title="Versión visible en ese momento" value={entry.snapshot.published} /></div></details></CardContent></Card>)}
      {pages(`${base}/${studentId}`, data.history.page, data.history.totalPages, 'historial')}
    </section>
  </Frame>;
}
