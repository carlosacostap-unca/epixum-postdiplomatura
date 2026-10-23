import { getCourseExamRoster } from '@/lib/course-exam-data';
import { CourseExamRoster } from '@/components/exams/CourseExamRoster';

export default async function Page({ params }: { params: Promise<{ id: string; examId: string }> }) {
  const { id, examId } = await params;
  const data = await getCourseExamRoster(id, examId);
  return <CourseExamRoster data={data} base={`/admin/courses/${id}/parciales`} />;
}
