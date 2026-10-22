import Link from 'next/link';
import { Card, CardContent, EmptyState } from '@/components/ui';
import FormattedDate from '@/components/FormattedDate';
import { practiceGrade, practiceStatusLabels } from '@/lib/preparation';
import type { getPreparation } from '@/lib/preparation-data';
import { BeginPracticeButton } from './PracticeRunner';
import { PreparationMonitor } from './PreparationMonitor';

type Data = Awaited<ReturnType<typeof getPreparation>>;
export const preparationLink = 'inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 py-2 font-bold text-[var(--color-on-primary)]';

export function PreparationOverview({ data, mode, basePath }: { data: Data; mode: 'teacher' | 'student'; basePath?: string }) {
  const { course, quizzes, history, historyQuizId } = data;
  const base = basePath || `/${mode === 'teacher' ? 'docentes' : 'estudiantes'}/cursos/${course.id}/preparacion`;
  const filterQuery = historyQuizId ? `&q=${encodeURIComponent(historyQuizId)}` : '';
  return <div className="space-y-10">
    <section aria-labelledby="practice-list-title" className="space-y-4"><h2 id="practice-list-title" className="text-2xl font-bold">{mode === 'teacher' ? 'Evaluaciones de práctica' : 'Prácticas disponibles'}</h2>
      {!quizzes.items.length ? <EmptyState icon="quiz" title="Todavía no hay prácticas" description={mode === 'teacher' ? 'Creá un cuestionario y publicalo cuando esté listo.' : 'Las prácticas aparecerán cuando el docente las publique.'} /> : <div className="grid gap-4 md:grid-cols-2">{quizzes.items.map(q => <Card key={q.id}><CardContent className="space-y-4">
        {mode === 'teacher' && <p className="text-sm font-bold text-[var(--color-primary)]">{practiceStatusLabels[q.status]}</p>}
        <h3 className="text-xl font-bold">{q.title}</h3><p className="whitespace-pre-wrap text-[var(--color-text-muted)]">{q.description}</p>
        <p className="font-semibold">{q.durationMinutes ? `Simulación de examen · ${q.durationMinutes} minutos · Nota de 0 a 10 · Cámara obligatoria` : 'Práctica sin tiempo límite · Devolución por pregunta'}</p>
        <p className="text-sm text-[var(--color-text-muted)]">Intentos ilimitados. Cada intento y resultado queda registrado.</p>
        {mode === 'teacher' ? <Link className={preparationLink} href={`${base}/${q.id}`}>Editar práctica</Link> : <BeginPracticeButton courseId={course.id} quizId={q.id} durationMinutes={q.durationMinutes} />}
        <Link className="inline-flex min-h-11 items-center font-semibold text-[var(--color-primary)]" href={`${base}?q=${q.id}#practice-history`}>{mode === 'teacher' ? 'Ver seguimiento de esta evaluación' : 'Ver mis intentos de esta evaluación'}</Link>
      </CardContent></Card>)}</div>}
      <nav aria-label="Páginas de prácticas" className="flex gap-4">{quizzes.page > 1 && <Link href={`${base}?p=${quizzes.page - 1}&h=${history.page}${filterQuery}`}>Prácticas anteriores</Link>}{quizzes.page < quizzes.totalPages && <Link href={`${base}?p=${quizzes.page + 1}&h=${history.page}${filterQuery}`}>Más prácticas</Link>}</nav>
    </section>
    <section id="practice-history" aria-labelledby="practice-history-title" className="space-y-4"><h2 id="practice-history-title" className="text-2xl font-bold">{mode === 'teacher' ? 'Seguimiento de alumnos' : 'Mis intentos'}</h2>
      {mode === 'teacher' && <PreparationMonitor />}
      {historyQuizId && <p>Mostrando los intentos de la evaluación seleccionada. <Link className="font-bold text-[var(--color-primary)]" href={`${base}#practice-history`}>Ver todas las evaluaciones</Link></p>}
      <p className="text-[var(--color-text-muted)]">{history.totalItems} {history.totalItems === 1 ? 'intento' : 'intentos'}. {mode === 'teacher' ? 'Consultá el avance, las respuestas confirmadas y los resultados.' : 'Retomá una práctica o revisá una corrección anterior.'}</p>
      {!history.items.length ? <p>No hay intentos registrados.</p> : <ul className="space-y-3">{history.items.map(a => <li key={a.id}><Link href={`${base}/intentos/${a.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-outline-variant)] p-5 hover:bg-[var(--color-surface-container)]">
        <div><h3 className="font-bold">{a.title}</h3>{mode === 'teacher' && <p>{a.studentName}</p>}<p className="mt-1 text-sm text-[var(--color-text-muted)]">Inicio: <FormattedDate date={a.created} showTime /></p>{a.finishedAt && <p className="mt-1 text-sm text-[var(--color-text-muted)]">Finalización: <FormattedDate date={a.finishedAt} showTime /></p>}{mode === 'teacher' && a.hasInitialPhoto && <p className="mt-1 text-sm">Foto inicial disponible</p>}</div>
        <span className="font-bold text-[var(--color-primary)]">{a.result ? `${a.result.completionReason === 'time_expired' ? 'Tiempo agotado' : 'Finalizado'} · ${a.result.correct}/${a.result.total} · Nota ${practiceGrade(a.result.correct, a.result.total)} / 10 · Ver corrección` : `${a.answeredCount} respuestas guardadas · ${mode === 'teacher' ? 'En curso' : 'Retomar práctica'}`}</span>
      </Link></li>)}</ul>}
      <nav aria-label="Páginas de intentos" className="flex gap-4">{history.page > 1 && <Link href={`${base}?p=${quizzes.page}&h=${history.page - 1}${filterQuery}#practice-history`}>Intentos anteriores</Link>}{history.page < history.totalPages && <Link href={`${base}?p=${quizzes.page}&h=${history.page + 1}${filterQuery}#practice-history`}>Más intentos</Link>}</nav>
    </section>
  </div>;
}
