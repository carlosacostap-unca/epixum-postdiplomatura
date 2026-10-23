import Link from 'next/link';
import { DataTable, StatCard } from '@/components/ui';
import { examDateLabel } from '@/lib/course-exams';
import { examProgressLabels, latestSubmittedStudentExam, progressFilterQuery, progressGradeLabel, type ProgressFilters, type StudentExamProgress, type StudentPracticeHistory } from '@/lib/student-progress';
import type { getStudentProgress } from '@/lib/student-progress-data';
import { ExamListRefresh } from '@/components/exams/ExamListRefresh';
import { CourseExamStanding } from '@/components/exams/CourseExamStanding';

export function StudentProgressDetail({ data, filters }: { data: Awaited<ReturnType<typeof getStudentProgress>>; filters: ProgressFilters }) {
  const student = data.rows[0]; const base = `/docentes/cursos/${data.course.id}`; const query = progressFilterQuery(filters);
  const latest = latestSubmittedStudentExam(student.exams);
  const link = 'inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]';
  const practiceColumns = [
    { id: 'title', header: 'Práctica', render: (p: StudentPracticeHistory) => <span className="font-bold">{p.title}</span> },
    { id: 'start', header: 'Inicio', render: (p: StudentPracticeHistory) => examDateLabel(p.created) },
    { id: 'state', header: 'Estado', render: (p: StudentPracticeHistory) => p.finishedAt ? `Finalizada ${examDateLabel(p.finishedAt)}` : `Sin finalizar · ${p.answerCount} respuestas guardadas` },
    { id: 'grade', header: 'Nota', render: (p: StudentPracticeHistory) => progressGradeLabel(p.grade) },
    { id: 'detail', header: 'Detalle', render: (p: StudentPracticeHistory) => <Link className={link} href={`${base}/preparacion/intentos/${p.id}`}>Consultar intento</Link> },
  ];
  const examColumns = [
    { id: 'title', header: 'Parcial', render: (e: StudentExamProgress) => <span className="font-bold">{e.title}</span> },
    { id: 'state', header: 'Estado', render: (e: StudentExamProgress) => <div><p>{examProgressLabels[e.state]}</p>{e.finishedAt && <p>{examDateLabel(e.finishedAt)}</p>}</div> },
    { id: 'grade', header: 'Nota', render: (e: StudentExamProgress) => progressGradeLabel(e.grade) },
    { id: 'correct', header: 'Aciertos', render: (e: StudentExamProgress) => e.correct === null ? '—' : `${e.correct} de ${e.total}` },
    { id: 'condition', header: 'Condición del parcial', render: (e: StudentExamProgress) => e.state === 'submitted' ? <CourseExamStanding correct={e.correct} total={e.total} /> : '—' },
    { id: 'feedback', header: 'Devolución', render: (e: StudentExamProgress) => e.attemptId ? <Link className={link} href={`${base}/parciales/intentos/${e.attemptId}`}>{e.state === 'submitted' ? 'Ver devolución completa' : 'Consultar avance'}</Link> : 'Sin intento registrado' },
  ];
  return <div className="min-w-0 space-y-8"><Link className={link} href={`${base}/estudiantes${query ? `?${query}` : ''}`}>Volver al listado con mis filtros</Link><div><h2 className="text-2xl font-bold">Historial de {student.name}</h2><p className="mt-2 break-all">{student.email}</p><p className="mt-2">Matrícula: {examDateLabel(student.enrolledAt)} · Última actividad en evaluaciones: {student.lastActivity ? examDateLabel(student.lastActivity) : 'Sin actividad registrada'}</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Intentos de preparación" value={student.preparation.attempts} /><StatCard label="Intentos finalizados" value={student.preparation.completedAttempts} /><StatCard label="Última nota de preparación" value={progressGradeLabel(student.preparation.latestGrade)} description={`Mejor nota: ${progressGradeLabel(student.preparation.bestGrade)}`} /><StatCard label="Parciales entregados" value={student.submittedExams} description={<><p>Última nota: {progressGradeLabel(student.latestExamGrade)}</p><CourseExamStanding correct={latest?.correct} total={latest?.total} /></>} /></div>
    <ExamListRefresh label="Actualizar seguimiento" />
    <section className="space-y-4"><h2 className="text-2xl font-bold">Preparación: historial de intentos</h2><p>Se conserva cada intento, para comparar fechas y resultados. Repetir una práctica no aumenta la cantidad de prácticas distintas completadas.</p>{data.preparationEnabled ? <DataTable ariaLabel="Historial de preparación del estudiante" columns={practiceColumns} getKey={row => row.id} items={data.practiceHistory} empty={<p>Este estudiante todavía no inició prácticas de preparación.</p>} /> : <p>Preparación no está habilitada en este curso.</p>}</section>
    <section className="space-y-4"><h2 className="text-2xl font-bold">Resultados de parciales</h2>{data.examsEnabled ? <DataTable ariaLabel="Parciales del estudiante" columns={examColumns} getKey={row => row.id} items={student.exams} empty={<p>Todavía no hay parciales publicados ni intentos registrados.</p>} /> : <p>Los parciales no están habilitados en este curso.</p>}</section>
  </div>;
}
