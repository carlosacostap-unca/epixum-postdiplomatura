import Link from 'next/link';
import { PracticeReview } from '@/components/preparation/PracticeReview';
import { getPreparationAttempt } from '@/lib/preparation-data';
import { InitialExamPhoto } from '@/components/preparation/InitialExamPhoto';

export default async function Page({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const { id, attemptId } = await params; const { attempt } = await getPreparationAttempt(id, attemptId, 'teacher');
  return <div className="space-y-6"><Link className="font-bold text-[var(--color-primary)]" href={`/admin/courses/${id}/preparacion`}>Volver al seguimiento</Link><h2 className="text-2xl font-bold">{attempt.title}</h2><InitialExamPhoto courseId={id} attemptId={attempt.id} available={attempt.hasInitialPhoto} />{attempt.result ? <PracticeReview result={attempt.result} audience="teacher" /> : <p>Intento en curso: {Object.keys(attempt.selected).length} de {attempt.questions.length} respuestas guardadas.{attempt.deadline && ' La corrección estará disponible al finalizar el examen.'}</p>}</div>;
}
