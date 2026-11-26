import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import FormattedDate from '@/components/FormattedDate';
import { Badge, Breadcrumbs, Card, CardContent, DataTable, EmptyState, PageHeader } from '@/components/ui';
import { getVisitingTeacherResults } from '@/lib/course-visiting-teacher-results';
import { getErrorStatus } from '@/lib/errors';
import { preparationPage } from '@/lib/preparation-service';

const linkClass = 'inline-flex min-h-11 items-center font-semibold text-[var(--color-primary)]';

function Grade({ value, adjusted }: { value: number | null; adjusted: boolean }) {
  return value === null ? 'Pendiente' : <>
    <strong>{value.toLocaleString('es-AR', { maximumFractionDigits: 2 })} / 10</strong>
    {adjusted && <span className="block text-sm text-[var(--color-text-muted)]">Con ajuste docente</span>}
  </>;
}

export default async function VisitingTeacherResultsPage({ params, searchParams }: {
  params: Promise<{ id: string; kind: string; activityId: string }>;
  searchParams: Promise<{ pagina?: string | string[]; intento?: string | string[] }>;
}) {
  const { id, kind, activityId } = await params;
  if (kind !== 'preparacion' && kind !== 'parciales') notFound();
  const { pagina, intento } = await searchParams;
  const page = preparationPage(typeof pagina === 'string' ? pagina : undefined);
  if (intento !== undefined && (typeof intento !== 'string' || !intento)) notFound();
  const data = await getVisitingTeacherResults(id, kind, activityId, page, intento).catch(error => {
    if (getErrorStatus(error) === 404) notFound();
    throw error;
  });
  const base = `/visitantes/cursos/${id}/${kind}/${activityId}`;
  const listHref = (number: number) => number > 1 ? `${base}?pagina=${number}` : base;
  const gradeLabel = kind === 'preparacion' ? 'Nota simulada' : 'Nota';
  if (!data.detail && data.page > Math.max(1, data.totalPages)) redirect(listHref(Math.max(1, data.totalPages)));

  return <div className="page-container space-y-7">
    <Breadcrumbs items={[
      { href: '/visitantes', label: 'Mis cursos' },
      { href: `/visitantes/cursos/${id}`, label: data.courseTitle },
      ...(data.detail ? [{ href: listHref(page), label: 'Intentos y notas' }, { label: 'Detalle del intento' }] : [{ label: 'Intentos y notas' }]),
    ]} />
    <PageHeader eyebrow={kind === 'preparacion' ? 'Preparación' : 'Parciales y exámenes'} title={data.title} actions={<Badge>Solo lectura</Badge>} />
    {data.detail ? <>
      <Card><CardContent className="space-y-2">
        <h2 className="font-headline text-xl font-bold">{data.detail.studentName}</h2>
        <p>{data.detail.state}</p>
        <p>Inicio · <FormattedDate date={data.detail.created} showTime /></p>
        {data.detail.deadline && <p>Cierre · <FormattedDate date={data.detail.deadline} showTime /></p>}
        {data.detail.finishedAt && <p>Finalización · <FormattedDate date={data.detail.finishedAt} showTime /></p>}
        <p>{gradeLabel} · <Grade value={data.detail.grade} adjusted={data.detail.adjusted} /></p>
        {data.detail.score && <p>Aciertos · {data.detail.score.correct} de {data.detail.score.total}</p>}
      </CardContent></Card>
      <section aria-label="Respuestas del alumno" className="space-y-4">
        <h2 className="font-headline text-2xl font-bold">Respuestas del alumno</h2>
        {data.detail.questions.length ? <ol className="space-y-3">
          {data.detail.questions.map((question, index) => <li key={question.id}>
            <Card><CardContent className="space-y-2">
              <h3 className="whitespace-pre-wrap font-semibold">{index + 1}. {question.prompt}</h3>
              <p className="whitespace-pre-wrap">{question.answer ?? 'Sin responder'}</p>
            </CardContent></Card>
          </li>)}
        </ol> : <p>Este intento no tiene preguntas registradas.</p>}
      </section>
    </> : <section aria-label="Intentos de alumnos" className="space-y-4">
      <h2 className="font-headline text-2xl font-bold">Intentos de alumnos</h2>
      <p>{data.totalItems} {data.totalItems === 1 ? 'intento registrado' : 'intentos registrados'}</p>
      <DataTable ariaLabel={`Intentos de ${data.title}`} items={data.rows} getKey={row => row.id} columns={[
        { id: 'student', header: 'Alumno', render: row => row.studentName },
        { id: 'created', header: 'Inicio', render: row => <FormattedDate date={row.created} showTime /> },
        { id: 'state', header: 'Estado', render: row => row.state },
        { id: 'grade', header: gradeLabel, render: row => <Grade value={row.grade} adjusted={row.adjusted} /> },
        { id: 'detail', header: 'Detalle', render: row => <Link className={linkClass} prefetch={false}
          href={`${base}?pagina=${data.page}&intento=${encodeURIComponent(row.id)}`} aria-label={`Ver intento de ${row.studentName}`}>
          Ver intento
        </Link> },
      ]} empty={<EmptyState icon="assignment" title="Todavía no hay intentos" description="Cuando se registre un intento, aparecerá en este listado." />} />
      {data.totalPages > 1 && <nav aria-label="Páginas de intentos" className="flex flex-wrap items-center gap-5">
        {data.page > 1 && <Link className={linkClass} href={listHref(data.page - 1)} prefetch={false}>Anterior</Link>}
        <span>Página {data.page} de {data.totalPages}</span>
        {data.page < data.totalPages && <Link className={linkClass} href={listHref(data.page + 1)} prefetch={false}>Siguiente</Link>}
      </nav>}
    </section>}
  </div>;
}
