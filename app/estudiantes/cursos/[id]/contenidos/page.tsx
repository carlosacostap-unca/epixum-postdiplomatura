import Link from 'next/link';
import { redirect } from 'next/navigation';
import { StudentCourseContext } from '@/components/course/StudentCourseContext';
import { Card, CardContent, EmptyState } from '@/components/ui';
import { getCourseContents } from '@/lib/course-content-data';
import { getCourse, isStudentEnrolled } from '@/lib/data';
import { getCurrentUser } from '@/lib/pocketbase-server';

export default async function StudentCourseContentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const course = await getCourse(id);
  if (!course?.contentsEnabled || !(await isStudentEnrolled(id, user.id))) redirect(`/estudiantes/cursos/${id}`);
  const contents = await getCourseContents(course.id);

  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
    <StudentCourseContext course={course} current="contenidos" description="Materiales de estudio independientes de las clases y trabajos prácticos." />
    {contents.length === 0 ? <EmptyState icon="library_books" title="Todavía no hay contenidos" description="Los materiales aparecerán aquí cuando el docente los añada." /> : <div className="grid gap-4 md:grid-cols-2">{contents.map((content, index) => <Link key={content.id} href={`/estudiantes/cursos/${course.id}/contenidos/${content.id}`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4"><Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent><div className="flex items-start justify-between gap-4"><span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-primary)]/10 font-bold text-[var(--color-primary)]">{index + 1}</span><span className="material-symbols-outlined text-[var(--color-primary)]">arrow_forward</span></div><h2 className="mt-4 font-headline text-xl font-bold">{content.title}</h2></CardContent></Card></Link>)}</div>}
  </div>;
}
