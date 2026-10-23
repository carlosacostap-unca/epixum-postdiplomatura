import { getCourseExams } from '@/lib/course-exam-data';
import { CourseExamOverview } from '@/components/exams/CourseExamOverview';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCourseExams(id, 'manage');
  return <div className="space-y-6"><h2 className="text-2xl font-bold">Parciales</h2><CourseExamOverview data={data} base={`/admin/courses/${id}/parciales`} manage /></div>;
}
