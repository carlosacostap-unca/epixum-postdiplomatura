import { redirect } from 'next/navigation';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { ExamStart } from '@/components/preparation/ExamStart';
import { getExamStart } from '@/lib/preparation-data';

export default async function Page({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params;
  const { course, quiz, resumeId } = await getExamStart(id, quizId);
  if (resumeId) redirect(`/estudiantes/cursos/${id}/preparacion/intentos/${resumeId}`);
  if (!quiz) return null;
  return <div className="page-container space-y-8"><StudentCourseContext course={course} current="preparacion" title={quiz.title} description="Prepará tu cámara antes de comenzar la simulación." /><ExamStart courseId={id} quizId={quiz.id} durationMinutes={quiz.durationMinutes} questionCount={quiz.questionCount} /></div>;
}
