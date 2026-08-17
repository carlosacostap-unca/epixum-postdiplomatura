import { notFound, redirect } from 'next/navigation';
import { ResourceReader } from '@/components/course/ResourceReader';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { Card, CardContent, EmptyState } from '@/components/ui';
import { getCourseContentWithResources } from '@/lib/course-content-data';
import { getCourse, isStudentEnrolled } from '@/lib/data';
import { getCurrentUser } from '@/lib/pocketbase-server';

export default async function StudentCourseContentPage({ params }: { params: Promise<{ id: string; contentId: string }> }) {
  const { id, contentId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== 'estudiante') redirect('/');
  const course = await getCourse(id);
  if (!course?.contentsEnabled || !(await isStudentEnrolled(id, user.id))) redirect(`/estudiantes/cursos/${id}`);
  const result = await getCourseContentWithResources(course.id, contentId);
  if (!result) notFound();

  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
    <StudentCourseContext course={course} current="contenidos" title={result.content.title} description="Material de estudio del curso." />
    <Card><CardContent><h2 className="font-headline text-2xl font-bold">Contenido</h2>{result.content.description ? <div className="prose prose-invert mt-5 max-w-none text-[var(--color-on-surface-variant)]" dangerouslySetInnerHTML={{ __html: result.content.description }} /> : <EmptyState className="mt-5" icon="description" title="Sin descripción" description="Este contenido todavía no tiene una explicación adicional." />}</CardContent></Card>
    <ResourceReader links={result.links} emptyDescription="Este contenido todavía no tiene archivos ni enlaces." />
  </div>;
}
