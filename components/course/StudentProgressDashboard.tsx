import Link from 'next/link';
import { DataTable } from '@/components/ui';
import { examDateLabel } from '@/lib/course-exams';
import { examProgressLabels, filterStudentProgress, progressFilterQuery, progressGradeLabel, type ProgressFilters, type StudentProgressRow } from '@/lib/student-progress';
import type { getStudentProgress } from '@/lib/student-progress-data';
import { StudentProgressSummary } from './StudentProgressSummary';
import { ExamListRefresh } from '@/components/exams/ExamListRefresh';

const field = 'mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3 py-2 text-sm';
export function StudentProgressDashboard({ data, filters }: { data: Awaited<ReturnType<typeof getStudentProgress>>; filters: ProgressFilters }) {
  const base = `/docentes/cursos/${data.course.id}/estudiantes`;
  const page = filterStudentProgress(data.rows, filters, data.serverNow);
  const query = progressFilterQuery({ ...filters, page: page.page });
  const pageLink = (n: number) => `${base}?${progressFilterQuery({ ...filters, page: n })}`;
  const columns = [
    { id: 'student', header: 'Estudiante', render: (row: StudentProgressRow) => <div className="space-y-1"><p className="font-bold">{row.name}</p><p className="break-all text-[var(--color-text-muted)]">{row.email || 'Sin correo registrado'}</p></div> },
    { id: 'preparation', header: 'Preparación', render: (row: StudentProgressRow) => !data.preparationEnabled ? 'No habilitada' : <div className="space-y-1"><p>{row.preparation.attempts ? `${row.preparation.attempts} intentos · ${row.preparation.completedAttempts} finalizados` : 'Sin prácticas iniciadas'}</p>{row.preparation.publishedTotal > 0 && <p>{row.preparation.publishedCompleted} de {row.preparation.publishedTotal} prácticas publicadas finalizadas</p>}<p className="text-[var(--color-text-muted)]">Última nota: {progressGradeLabel(row.preparation.latestGrade)}</p></div> },
    { id: 'exams', header: 'Parciales', render: (row: StudentProgressRow) => {
      if (!data.examsEnabled) return 'No habilitados';
      if (filters.exam) { const exam = row.exams.find(e => e.id === filters.exam); return exam ? <div className="space-y-1"><p>{examProgressLabels[exam.state]}</p><p className="font-bold">{progressGradeLabel(exam.grade)}</p></div> : 'Sin datos del parcial'; }
      return <div className="space-y-1"><p>{row.submittedExams} de {row.exams.length} parciales entregados</p><p className="font-bold">Última nota: {progressGradeLabel(row.latestExamGrade)}</p>{row.exams.some(e => e.state === 'in_progress') && <p>Con un parcial en curso</p>}</div>;
    } },
    { id: 'activity', header: 'Última actividad', render: (row: StudentProgressRow) => row.lastActivity ? <span>{examDateLabel(row.lastActivity)}</span> : 'Sin actividad registrada' },
    { id: 'detail', header: 'Detalle', render: (row: StudentProgressRow) => <Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" aria-label={`Ver detalle de ${row.name}`} href={`${base}/${row.id}${query ? `?${query}` : ''}`}>Ver detalle</Link> },
  ];
  return <div className="min-w-0 space-y-6">
    <StudentProgressSummary rows={data.rows} preparationEnabled={data.preparationEnabled} examsEnabled={data.examsEnabled} />
    <p>El seguimiento resume la preparación y los parciales. La última actividad corresponde a esas evaluaciones; no mide asistencia ni lectura de materiales. Todas las notas se muestran sobre 10.</p>
    {!data.preparationEnabled && !data.examsEnabled && <p>Este curso no tiene preparación ni parciales habilitados. Por ahora se muestran las matrículas vigentes.</p>}
    <form method="get" action={base} className="space-y-4 rounded-2xl border border-[var(--color-outline-variant)] p-4 md:p-6" aria-label="Filtrar estudiantes">
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0 font-semibold">Buscar estudiante<input className={field} name="q" type="search" maxLength={120} placeholder="Nombre o correo" defaultValue={filters.q} /></label>
        <label className="min-w-0 font-semibold">Preparación<select className={field} name="preparacion" defaultValue={filters.preparation} disabled={!data.preparationEnabled}><option value="all">Todos</option><option value="none">Sin prácticas iniciadas</option><option value="started">Inició, sin finalizar prácticas</option><option value="completed">Con prácticas finalizadas</option><option value="all_completed">Todas las publicadas finalizadas</option></select></label>
        <label className="min-w-0 font-semibold">Parcial<select className={field} name="parcial" defaultValue={filters.exam} disabled={!data.examsEnabled}><option value="">Todos los parciales</option>{data.exams.map(exam => <option key={exam.id} value={exam.id}>{exam.title}</option>)}</select></label>
        <label className="min-w-0 font-semibold">Estado del parcial<select className={field} name="estado_parcial" defaultValue={filters.examState} disabled={!data.examsEnabled}><option value="all">Todos</option><option value="not_started">Sin iniciar</option><option value="in_progress">En curso</option><option value="submitted">Entregado</option><option value="missing_after_close">Sin entrega al cierre</option></select></label>
        <label className="min-w-0 font-semibold">Actividad<select className={field} name="actividad" defaultValue={filters.activity}><option value="all">Todos</option><option value="active">Con actividad registrada</option><option value="none">Sin actividad registrada</option><option value="recent7">Actividad en los últimos 7 días</option><option value="inactive14">Sin actividad en los últimos 14 días</option></select></label>
        <label className="min-w-0 font-semibold">Nota mínima de parcial<input className={field} name="nota_min" type="number" min={0} max={10} step="0.01" defaultValue={filters.minGrade} disabled={!data.examsEnabled} /></label>
        <label className="min-w-0 font-semibold">Nota máxima de parcial<input className={field} name="nota_max" type="number" min={0} max={10} step="0.01" defaultValue={filters.maxGrade} disabled={!data.examsEnabled} /></label>
        <label className="min-w-0 font-semibold">Ordenar<select className={field} name="orden" defaultValue={filters.sort}><option value="name">Nombre</option><option value="activity">Actividad más reciente</option><option value="grade_desc">Mayor nota de parcial</option><option value="grade_asc">Menor nota de parcial</option><option value="preparation">Más prácticas finalizadas</option></select></label>
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">El rango de notas usa el parcial seleccionado o, si elegís todos, el último parcial entregado de cada estudiante. Sin nota no equivale a cero. Los filtros se combinan.</p>
      {filters.minGrade !== '' && filters.maxGrade !== '' && Number(filters.minGrade) > Number(filters.maxGrade) && <p role="alert">La nota mínima debe ser menor o igual a la máxima.</p>}
      <div className="flex flex-wrap items-center gap-4"><button type="submit" className="min-h-11 rounded-xl bg-[var(--color-primary)] px-5 py-2 font-bold text-[var(--color-on-primary)]">Aplicar filtros</button><Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={base}>Limpiar filtros</Link></div>
    </form>
    <div className="flex flex-wrap items-center justify-between gap-3"><p role="status">{page.total} de {data.rows.length} estudiantes coinciden · Página {page.page} de {page.totalPages}</p><ExamListRefresh label="Actualizar seguimiento" /></div>
    <DataTable ariaLabel="Seguimiento de estudiantes" columns={columns} getKey={row => row.id} items={page.items} empty={<p>No hay estudiantes que coincidan con los filtros. Podés limpiar los filtros para ver todas las matrículas vigentes.</p>} />
    {page.totalPages > 1 && <nav aria-label="Páginas de estudiantes" className="flex flex-wrap gap-6">{page.page > 1 && <Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={pageLink(page.page - 1)}>Página anterior</Link>}{page.page < page.totalPages && <Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={pageLink(page.page + 1)}>Página siguiente</Link>}</nav>}
  </div>;
}
