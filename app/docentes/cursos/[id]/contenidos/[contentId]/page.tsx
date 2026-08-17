import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ResourceManager } from '@/components/course/ResourceManager';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { Card, CardContent, EmptyState } from '@/components/ui';
import { getCourseContentWithResources } from '@/lib/course-content-data';
import { getCourse } from '@/lib/data';
import { getCurrentUser } from '@/lib/pocketbase-server';

export default async function TeacherCourseContentPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const { id, contentId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'docente') redirect('/');
  const course = await getCourse(id);
  if (!course?.contentsEnabled || !course.teachers?.includes(user.id)) redirect(`/docentes/cursos/${id}`);
  const result = await getCourseContentWithResources(course.id, contentId);
  if (!result) notFound();

  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
    <TeacherCourseContext course={course} current="contenidos" title={result.content.title} description="Contenido visible inmediatamente para estudiantes matriculados." actions={<Link href={`/docentes/cursos/${course.id}/contenidos/${result.content.id}/editar`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-surface-container-highest)] px-5 text-sm font-bold"><span className="material-symbols-outlined text-lg">edit</span>Editar</Link>} />
    <Card><CardContent><h2 className="font-headline text-2xl font-bold">Descripción</h2>{result.content.description ? <div className="prose prose-invert mt-5 max-w-none text-[var(--color-on-surface-variant)]" dangerouslySetInnerHTML={{ __html: result.content.description }} /> : <EmptyState className="mt-5" icon="description" title="Sin descripción" description="Podés editar el contenido para añadir una explicación." />}</CardContent></Card>
    <ResourceManager links={result.links} parent={{ type: 'content', id: result.content.id }} />
  </div>;
}
