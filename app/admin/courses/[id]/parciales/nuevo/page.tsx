import { getCourseExamEditor } from '@/lib/course-exam-data';
import { CourseExamEditor } from '@/components/exams/CourseExamEditor';
export default async function Page({ params }: { params: Promise<{ id: string; examId?: string }> }) {
  const { id, examId } = await params;
  const { course, exam } = await getCourseExamEditor(id, undefined);
  return <div className="space-y-6"><h2 className="text-2xl font-bold">{exam?.title || `Nuevo parcial · ${course.title}`}</h2><CourseExamEditor courseId={id} exam={exam} basePath={`/admin/courses/${id}/parciales`} /></div>;
}
