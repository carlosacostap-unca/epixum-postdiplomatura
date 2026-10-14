import { QuizEditor } from '@/components/preparation/QuizEditor';
import { getPreparationQuiz } from '@/lib/preparation-data';

export default async function Page({ params }: { params: Promise<{ id: string; quizId: string }> }) {
  const { id, quizId } = await params; const { quiz } = await getPreparationQuiz(id, quizId);
  return <div className="space-y-6"><h2 className="text-2xl font-bold">Editar simulación</h2><QuizEditor courseId={id} quiz={quiz} basePath={`/admin/courses/${id}/preparacion`} /></div>;
}
