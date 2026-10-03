import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TeacherCourseContext } from '@/components/course/TeacherCourseContext';
import { TeacherCourseContentList } from '@/components/course/TeacherCourseContentList';
import { getCourseContents } from '@/lib/course-content-data';
import { getCourse } from '@/lib/data';
import { getCurrentUser } from '@/lib/pocketbase-server';

export default async function TeacherCourseContentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const course = await getCourse(id);
  if (!course?.contentsEnabled || !course.teachers?.includes(user.id)) redirect(`/docentes/cursos/${id}`);
  const contents = await getCourseContents(course.id);

  return <div className="page-container space-y-8">
    <TeacherCourseContext course={course} current="contenidos" description="Materiales de estudio independientes de las clases, trabajos y unidades." actions={<Link href={`/docentes/cursos/${course.id}/contenidos/nuevo`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-[var(--color-on-primary)]"><span className="material-symbols-outlined text-lg">add</span>Nuevo contenido</Link>} />
    <TeacherCourseContentList courseId={course.id} contents={contents} />
  </div>;
}
