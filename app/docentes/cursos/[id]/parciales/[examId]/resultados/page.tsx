import { getCourseExamRoster } from '@/lib/course-exam-data';
import { CourseExamRoster } from '@/components/exams/CourseExamRoster';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';

export default async function Page({ params }: { params: Promise<{ id: string; examId: string }> }) {
  const { id, examId } = await params;
  const data = await getCourseExamRoster(id, examId);
  return <div className="page-container space-y-6"><TeacherCourseContext course={data.course} current="parciales" title="Alumnos y notas" /><CourseExamRoster data={data} base={`/docentes/cursos/${id}/parciales`} /></div>;
}
