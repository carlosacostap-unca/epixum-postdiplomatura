import Link from 'next/link';
import { Card, CardContent } from '@/components/ui';
import { examAvailability, examDateLabel } from '@/lib/course-exams';
import type { getCourseExams } from '@/lib/course-exam-data';
import { ExamListRefresh } from './ExamListRefresh';

export const examLink = 'inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 py-2 font-bold text-[var(--color-on-primary)]';
export function CourseExamOverview({ data, base, manage }: { data: Awaited<ReturnType<typeof getCourseExams>>; base: string; manage: boolean }) {
  return <div className="space-y-6"><ExamListRefresh /><p>Horarios de Argentina (Buenos Aires). La cámara es obligatoria durante cada parcial.</p>
    {manage && <Link href={`${base}/nuevo`} className={examLink}>Nuevo parcial</Link>}
    {!data.exams.length && <p>Todavía no hay parciales {manage ? 'creados' : 'publicados'}.</p>}
    {data.exams.map(exam => {
      const attempt = data.attempts.find(a => a.exam === exam.id);
      const result = attempt && data.results.find(r => r.attempt === attempt.id);
      const availability = examAvailability(exam);
      return <Card key={exam.id}><CardContent className="space-y-3"><h2 className="text-xl font-bold">{exam.title}</h2><p>{availability}</p><p className="whitespace-pre-wrap">{exam.description}</p><p>Activación: {examDateLabel(exam.opensAt)} · Cierre y entrega: {examDateLabel(exam.closesAt)}</p>
        {manage ? <Link className={examLink} href={`${base}/${exam.id}`}>Editar parcial</Link> : attempt ? <><Link className={examLink} href={`${base}/intentos/${attempt.id}`}>{result?.feedbackAvailable ? 'Ver resultado y devolución' : result ? 'Ver entrega' : 'Retomar parcial'}</Link>{result && !result.feedbackAvailable && <p>La nota y la devolución completa estarán disponibles después del cierre.</p>}</> : availability === 'Activo' ? <Link className={examLink} href={`${base}/iniciar/${exam.id}`}>Comenzar parcial</Link> : <p>{availability === 'Programado' ? 'Disponible al llegar la fecha de activación.' : 'El horario del parcial finalizó.'}</p>}
      </CardContent></Card>;
    })}
    {manage && <section className="space-y-4"><h2 className="text-2xl font-bold">Intentos y entregas</h2>{!data.attempts.length && <p>No hay intentos todavía.</p>}{data.attempts.map(attempt => {
      const result = data.results.find(r => r.attempt === attempt.id);
      return <Card key={attempt.id}><CardContent className="space-y-2"><p className="font-bold">{attempt.expand?.student?.name || 'Alumno'} · {data.exams.find(e => e.id === attempt.exam)?.title || 'Parcial'}</p><p>Inicio: {examDateLabel(attempt.created)} · {result ? `Entregado ${examDateLabel(result.finishedAt)}${result.reason === 'expired' ? ' (cierre automático)' : ''}` : 'En curso'}</p>{result?.feedbackAvailable && <p>{result.correct} / {result.total} correctas · Nota {result.total ? (result.correct / result.total * 10).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : 0} / 10</p>}<Link className={examLink} href={`${base}/intentos/${attempt.id}`}>Ver respuestas</Link></CardContent></Card>;
    })}</section>}
  </div>;
}
