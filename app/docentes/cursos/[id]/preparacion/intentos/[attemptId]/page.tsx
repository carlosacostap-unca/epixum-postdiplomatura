import Link from 'next/link';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { PracticeReview } from '@/components/preparation/PracticeReview';
import { getPreparationAttempt } from '@/lib/preparation-data';
export default async function AttemptPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params; const { course, attempt } = await getPreparationAttempt(id, attemptId, 'teacher');
  return <div className="page-container space-y-8"><TeacherCourseContext course={course} current="preparacion" title={attempt.title} description="Detalle de un intento de preparación. Sólo para consulta docente." /><Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={`/docentes/cursos/${id}/preparacion`}>Volver al seguimiento</Link>{attempt.result ? <PracticeReview result={attempt.result} audience="teacher" /> : <p>El alumno todavía no finalizó este intento.</p>}</div>;
}
