import Link from 'next/link';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { PracticeRunner } from '@/components/preparation/PracticeRunner';
import { getPreparationAttempt } from '@/lib/preparation-data';
export default async function AttemptPage({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params; const { course, attempt } = await getPreparationAttempt(id, attemptId, 'student');
  return <div className="page-container space-y-8"><StudentCourseContext course={course} current="preparacion" title={attempt.title} description={attempt.description} /><Link className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]" href={`/estudiantes/cursos/${id}/preparacion`}>Volver a mis prácticas</Link><PracticeRunner courseId={id} attemptId={attempt.id} questions={attempt.questions} initialResult={attempt.result} /></div>;
}
