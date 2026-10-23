import { getCourseExamAttempt } from '@/lib/course-exam-data';
import { CourseExamInspection } from '@/components/exams/CourseExamInspection';
export default async function Page({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params;
  const { attempt } = await getCourseExamAttempt(id, attemptId, 'manage');
  return <div className="page-container space-y-6"><CourseExamInspection attempt={attempt} backPath={`/docentes/cursos/${id}/parciales/${attempt.examId}/resultados`} /></div>;
}
