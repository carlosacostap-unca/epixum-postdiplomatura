import { CourseExamRequirements } from '@/components/exams/CourseExamRequirements';
import { ExamListRefresh } from '@/components/exams/ExamListRefresh';
import { examAvailability } from '@/lib/course-exams';
import { getCourseExamStart } from '@/lib/course-exam-data';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { CourseExamStart } from '@/components/exams/CourseExamRunner';
import { redirect } from 'next/navigation';
export default async function Page({ params }: { params: Promise<{ id: string; examId: string }> }) {
  const { id, examId } = await params; const { course, exam, requirements, existingAttemptId } = await getCourseExamStart(id, examId);
  if (existingAttemptId) redirect(`/estudiantes/cursos/${id}/parciales/intentos/${existingAttemptId}`);
  return <div className="page-container space-y-6"><StudentCourseContext course={course} current="parciales" title="Comenzar parcial" /><ExamListRefresh label="Actualizar requisitos" /><CourseExamRequirements courseId={id} requirements={requirements} />{requirements.every(item => item.completed) && examAvailability(exam) === 'Activo' ? <CourseExamStart courseId={id} exam={exam} /> : <p>{exam.title} · {examAvailability(exam)}. Para comenzar, necesitás cumplir los requisitos y estar dentro del horario de un turno.</p>}</div>;
}
