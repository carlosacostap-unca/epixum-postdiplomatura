import { QuizEditor } from '@/components/preparation/QuizEditor';
import { getPreparationQuiz } from '@/lib/preparation-data';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; await getPreparationQuiz(id);
  return <div className="space-y-6"><h2 className="text-2xl font-bold">Nueva simulación</h2><QuizEditor courseId={id} quiz={null} basePath={`/admin/courses/${id}/preparacion`} defaultTimed /></div>;
}
