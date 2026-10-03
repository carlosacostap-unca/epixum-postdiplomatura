import Link from 'next/link';
import { LiveHistory } from '@/components/interactive/LiveHistory';
import { Card, CardContent, EmptyState, PageHeader } from '@/components/ui';
import { InteractiveLessonList, interactiveLinkClass } from '@/components/course/InteractiveLessonList';
import { getInteractiveCourses, getInteractiveLessons } from '@/lib/interactive-class-data';

export default async function InteractiveLibraryPage({ searchParams }: { searchParams: Promise<{ p?: string; sesionesP?: string }> }) {
  const { p, sesionesP } = await searchParams;
  const courses = await getInteractiveCourses();
  const lessons = courses.length ? await getInteractiveLessons({ page: Number(p) || 1 }) : null;
  return <div className="page-container space-y-8">
    <PageHeader eyebrow="Docencia" title="Clases interactivas" description="Prepará pantallas y actividades para las clases de tus cursos." />
    {courses.length ? <>
      <LiveHistory page={Number(sesionesP) || 1} />
      <section aria-labelledby="interactive-courses" className="space-y-4">
        <h2 id="interactive-courses" className="font-headline text-xl font-bold">Crear en un curso</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{courses.map((course) => <Card key={course.id}><CardContent className="space-y-4">
          <Link href={`/docentes/cursos/${course.id}/interactivas`} className="block font-bold hover:text-[var(--color-primary)]">{course.title}</Link>
          <Link href={`/docentes/cursos/${course.id}/interactivas/nueva`} className={interactiveLinkClass}>Nueva clase interactiva</Link>
        </CardContent></Card>)}</div>
      </section>
      {lessons && <section aria-labelledby="interactive-library" className="space-y-4"><h2 id="interactive-library" className="font-headline text-xl font-bold">Tu biblioteca</h2><InteractiveLessonList result={lessons} basePath="/docentes/interactivas" showCourse /></section>}
    </> : <EmptyState icon="interactive_space" title="Tus cursos todavía no tienen clases interactivas habilitadas" description="La administración puede habilitar esta opción en la configuración de cada curso. Después podrás preparar materiales desde acá." />}
  </div>;
}
