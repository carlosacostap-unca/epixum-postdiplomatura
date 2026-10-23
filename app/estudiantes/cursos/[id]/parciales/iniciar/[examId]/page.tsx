import { getCourseExamStart } from '@/lib/course-exam-data';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { CourseExamStart } from '@/components/exams/CourseExamRunner';
import { redirect } from 'next/navigation';
export default async function Page({ params }: { params: Promise<{ id: string; examId: string }> }) {
  const { id, examId } = await params; const { course, exam, existingAttemptId } = await getCourseExamStart(id, examId);
  if (existingAttemptId) redirect(`/estudiantes/cursos/${id}/parciales/intentos/${existingAttemptId}`);
  return <div className="page-container space-y-6"><StudentCourseContext course={course} current="parciales" title="Comenzar parcial" /><CourseExamStart courseId={id} exam={exam} /></div>;
}
