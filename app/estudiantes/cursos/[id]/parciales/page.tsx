import { getCourseExams } from '@/lib/course-exam-data';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { CourseExamOverview } from '@/components/exams/CourseExamOverview';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const data = await getCourseExams(id, 'student');
  return <div className="page-container space-y-6"><StudentCourseContext course={data.course} current="parciales" title="Parciales" /><CourseExamOverview data={data} base={`/estudiantes/cursos/${id}/parciales`} manage={false} /></div>;
}
