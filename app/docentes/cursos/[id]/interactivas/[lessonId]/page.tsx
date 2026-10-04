import Link from 'next/link';
import { StartLiveSession } from '@/components/interactive/LiveEntry';
import { LiveHistory } from '@/components/interactive/LiveHistory';
import { Badge, Card, CardContent, EmptyState } from '@/components/ui';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { InteractiveMaterialPreview } from '@/components/course/InteractiveMaterialPreview';
import { InteractiveLessonDelete } from '@/components/course/InteractiveLessonDelete';
import { interactiveLinkClass } from '@/components/course/InteractiveLessonList';
import { getInteractiveCourse, getInteractiveLesson } from '@/lib/interactive-class-data';
import { inspectInteractiveMaterial, isInteractiveLessonReady } from '@/lib/interactive-material';
import { getClass } from '@/lib/data';

export default async function InteractiveLessonPage({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = await params;
  const course = await getInteractiveCourse(id);
  const lesson = await getInteractiveLesson(id, lessonId);
  const linkedClass = lesson.class ? await getClass(lesson.class) : null;
  const { material, error } = inspectInteractiveMaterial(lesson.material);
  const ready = isInteractiveLessonReady(lesson);
  const editPath = `/docentes/cursos/${id}/interactivas/${lessonId}/editar`;
  return <div className="page-container space-y-8">
    <TeacherCourseContext course={course} current="interactivas" title={lesson.title} description={lesson.description || 'Pantallas y actividades preparadas para una clase del curso.'} actions={<Link href={editPath} className={interactiveLinkClass}>Editar preparación</Link>} />
    <Card><CardContent className="space-y-4">
      <div className="flex flex-wrap gap-3"><Badge tone={ready ? 'success' : 'warning'}>{ready ? 'Preparada' : 'Borrador'}</Badge><Badge>Solo docentes</Badge></div>
      {linkedClass ? <p>Clase asociada: <Link href={`/docentes/cursos/${id}/clases/${linkedClass.id}`} className="font-bold text-[var(--color-primary)]">{linkedClass.title}</Link></p> : <p>Todavía no tiene una clase habitual asociada.</p>}
      <p className="text-sm text-[var(--color-text-muted)]">Ensayá el material o iniciá una sesión para compartir las pantallas y actividades con tus alumnos.</p>
      {material && <Link href={`/docentes/cursos/${id}/interactivas/${lessonId}/simulacion`} className={interactiveLinkClass}>Simular clase con alumnos</Link>}
      {ready && <StartLiveSession courseId={id} lessonId={lessonId} />}
    </CardContent></Card>
    <LiveHistory lessonId={lessonId} />
    {material ? <InteractiveMaterialPreview material={material} /> : <EmptyState icon="slides" title={error ? 'El material necesita revisión' : 'Falta preparar el material'} description={error || 'Importá un material para recorrer sus pantallas y probar las actividades.'} action={<Link href={editPath} className={interactiveLinkClass}>{error ? 'Reemplazar material' : 'Importar material'}</Link>} />}
    <div className="border-t border-[var(--color-outline-variant)] pt-5"><InteractiveLessonDelete courseId={id} lessonId={lessonId} title={lesson.title} /></div>
  </div>;
}
