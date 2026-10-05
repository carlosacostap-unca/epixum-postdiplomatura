import { notFound } from 'next/navigation';
import Link from 'next/link';
import BedelCourseContent from '@/components/bedel/BedelCourseContent';
import { Badge, Breadcrumbs, PageHeader } from '@/components/ui';
import { getBedelCourse } from '@/lib/course-bedel-data';
import { getErrorStatus } from '@/lib/errors';

export default async function BedelCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getBedelCourse(id).catch(error => { if (getErrorStatus(error) === 404) notFound(); throw error; });
  return <div className="page-container space-y-8">
    <Breadcrumbs items={[{ href: '/bedeles', label: 'Mis cursos' }, { label: data.course.title }]} />
    <PageHeader eyebrow="Bedelía" title={data.course.title} description="Contenido del curso. Acceso de solo lectura." actions={<Badge>Solo lectura</Badge>} />
    <Link className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-surface-container-highest)] px-5 font-semibold" href={`/bedeles/cursos/${id}/asistencias`}>Ver asistencias</Link>
    <BedelCourseContent data={data} />
  </div>;
}
