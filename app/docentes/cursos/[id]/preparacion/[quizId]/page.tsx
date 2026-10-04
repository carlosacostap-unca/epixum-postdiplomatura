import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { QuizEditor } from '@/components/preparation/QuizEditor';
import { getPreparationQuiz } from '@/lib/preparation-data';
export default async function EditPracticePage({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params; const { course, quiz } = await getPreparationQuiz(id, quizId);
  return <div className="page-container space-y-8"><TeacherCourseContext course={course} current="preparacion" title="Editar práctica" description="Los cambios se aplican a intentos nuevos; el historial conserva su versión original." /><QuizEditor courseId={id} quiz={quiz} /></div>;
}
