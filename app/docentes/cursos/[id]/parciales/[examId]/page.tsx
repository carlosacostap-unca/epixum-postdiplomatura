import { getCourseExamEditor } from '@/lib/course-exam-data';
import { CourseExamEditor } from '@/components/exams/CourseExamEditor';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
export default async function Page({ params }: { params: Promise<{ id: string; examId?: string }> }) {
  const { id, examId } = await params;
  const { course, exam } = await getCourseExamEditor(id, examId);
  return <div className="page-container space-y-6"><TeacherCourseContext course={course} current="parciales" title={exam?.title || "Nuevo parcial"} /><CourseExamEditor courseId={id} exam={exam} basePath={`/docentes/cursos/${id}/parciales`} /></div>;
}
