import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { QuizEditor } from '@/components/preparation/QuizEditor';
import { getPreparationQuiz } from '@/lib/preparation-data';
export default async function NewPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const { course } = await getPreparationQuiz(id);
  return <div className="page-container space-y-8"><TeacherCourseContext course={course} current="preparacion" title="Nueva práctica" description="Prepará las preguntas, marcá la respuesta correcta y agregá una explicación." /><QuizEditor courseId={id} quiz={null} /></div>;
}
