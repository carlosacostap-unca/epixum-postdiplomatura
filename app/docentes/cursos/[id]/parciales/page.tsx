import { getCourseExams } from '@/lib/course-exam-data';
import { CourseExamOverview } from '@/components/exams/CourseExamOverview';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCourseExams(id, 'manage');
  return <div className="page-container space-y-6"><TeacherCourseContext course={data.course} current="parciales" title="Parciales" /><CourseExamOverview data={data} base={`/docentes/cursos/${id}/parciales`} manage /></div>;
}
