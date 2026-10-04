import Link from 'next/link';
import { EmptyState } from '@/components/ui';
import { SimulationRoom } from '@/components/interactive/SimulationRoom';
import { interactiveLinkClass } from '@/components/course/InteractiveLessonList';
import { getInteractiveLesson } from '@/lib/interactive-class-data';
import { inspectInteractiveMaterial } from '@/lib/interactive-material';

export default async function InteractiveSimulationPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  // Same authenticated course/teacher checks as preparation, before sending any material.
  const lesson = await getInteractiveLesson(id, lessonId);
  const { material, error } = inspectInteractiveMaterial(lesson.material);
  const back = `/docentes/cursos/${id}/interactivas/${lessonId}`;
  return <div className="page-container space-y-6">
    <Link href={back} className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">← Volver a la preparación</Link>
    {material ? <SimulationRoom key={lesson.id} material={material} title={lesson.title} /> : <EmptyState icon="slides" title="Falta material válido para simular" description={error || 'Importá las pantallas y actividades antes de abrir el ensayo.'} action={<Link href={`${back}/editar`} className={interactiveLinkClass}>Editar preparación</Link>} />}
  </div>;
}
