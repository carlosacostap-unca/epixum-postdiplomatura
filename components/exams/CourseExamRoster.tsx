import Link from 'next/link';
import { DataTable } from '@/components/ui';
import { examDateLabel } from '@/lib/course-exams';
import type { getCourseExamRoster } from '@/lib/course-exam-data';
import { ExamListRefresh } from './ExamListRefresh';
import { CourseExamStanding } from './CourseExamStanding';

export function CourseExamRoster({ data, base }: { data: Awaited<ReturnType<typeof getCourseExamRoster>>; base: string }) {
  const exam = data.exams[0];
  const rows = data.attempts.map(attempt => ({ attempt, student: attempt.expand?.student, result: data.results.find(r => r.attempt === attempt.id) })).sort((a, b) => (a.student?.name || a.student?.email || '').localeCompare(b.student?.name || b.student?.email || '', 'es'));
  const delivered = rows.filter(row => row.result);
  const pending = rows.filter(row => !row.result);
  const name = (row: typeof rows[number]) => row.student?.name || row.student?.email || 'Alumno sin nombre';
  const columns = [
    { id: 'student', header: 'Alumno', render: (row: typeof rows[number]) => <div className="space-y-1"><p className="font-bold">{name(row)}</p>{row.student?.email && <p className="break-all text-[var(--color-text-muted)]">{row.student.email}</p>}</div> },
    { id: 'grade', header: 'Nota', render: (row: typeof rows[number]) => row.result?.feedbackAvailable ? <span className="font-bold">{(row.result.total ? row.result.correct / row.result.total * 10 : 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })} / 10</span> : 'Pendiente de entrega' },
    { id: 'correct', header: 'Aciertos', render: (row: typeof rows[number]) => row.result?.feedbackAvailable ? `${row.result.correct} de ${row.result.total}` : '—' },
    { id: 'condition', header: 'Condición del parcial', render: (row: typeof rows[number]) => row.result?.feedbackAvailable ? <CourseExamStanding correct={row.result.correct} total={row.result.total} /> : '—' },
    { id: 'finished', header: 'Entrega', render: (row: typeof rows[number]) => row.result ? <div><p>{examDateLabel(row.result.finishedAt)}</p><p className="text-[var(--color-text-muted)]">{row.result.reason === 'expired' ? 'Automática por cierre' : 'Manual'}</p></div> : 'En curso' },
    { id: 'feedback', header: 'Devolución', render: (row: typeof rows[number]) => <Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" aria-label={`${row.result ? 'Ver devolución completa' : 'Ver avance'} de ${name(row)}`} href={`${base}/intentos/${row.attempt.id}`}>{row.result ? 'Ver devolución completa' : 'Ver avance'}</Link> },
  ];
  return <div className="min-w-0 space-y-6"><Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={base}>Volver a parciales</Link><div><h2 className="text-2xl font-bold">Alumnos que rindieron</h2><p className="mt-2 text-lg">{exam.title}</p><p className="mt-2">{delivered.length} entregas · {pending.length} intentos en curso</p></div><ExamListRefresh /><p>Notas sobre 10. Horarios de Argentina. Abrí la devolución de cada alumno para ver sus respuestas, las correctas y las explicaciones.</p><DataTable ariaLabel={`Alumnos que rindieron ${exam.title}`} columns={columns} getKey={row => row.attempt.id} items={delivered} empty={<p>Todavía no hay alumnos que hayan entregado este parcial.</p>} />{pending.length > 0 && <section className="space-y-4"><h3 className="text-xl font-bold">En curso</h3><p>Estos alumnos iniciaron el parcial, pero todavía no tienen una entrega definitiva.</p><DataTable ariaLabel="Alumnos con el parcial en curso" columns={columns} getKey={row => row.attempt.id} items={pending} /></section>}</div>;
}
