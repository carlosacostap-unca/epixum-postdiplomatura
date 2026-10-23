import { getCourseExamAttempt } from '@/lib/course-exam-data';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { CourseExamRunner } from '@/components/exams/CourseExamRunner';
export default async function Page({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params; const { course, attempt } = await getCourseExamAttempt(id, attemptId);
  return <div className="page-container space-y-6"><StudentCourseContext course={course} current="parciales" title={attempt.title} description={attempt.description} /><CourseExamRunner key={attempt.id} courseId={id} initial={attempt} /></div>;
}
