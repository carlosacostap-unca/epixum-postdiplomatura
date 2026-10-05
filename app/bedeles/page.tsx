import Link from 'next/link';
import { Badge, Card, CardContent, EmptyState, PageHeader } from '@/components/ui';
import { getBedelCourses } from '@/lib/course-bedel-data';

export default async function BedelesPage() {
  const courses = await getBedelCourses();
  return <div className="page-container space-y-8">
    <PageHeader eyebrow="Bedelía" title="Mis cursos" description="Consultá el contenido y las asistencias de los cursos donde estás asignado como bedel. Acceso de solo lectura." />
    {!courses.length ? <EmptyState icon="school" title="No tenés cursos asignados como bedel" description="Administración debe asignar tu email al curso. Ingresá con ese mismo correo verificado." /> :
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{courses.map(course => <Link key={course.id} href={`/bedeles/cursos/${course.id}`}><Card className="h-full"><CardContent>
        <Badge>Solo lectura</Badge><h2 className="mt-4 font-headline text-xl font-bold">{course.title}</h2><p className="mt-3 text-sm text-[var(--color-text-muted)]">{course.status}</p><p className="mt-5 font-semibold text-[var(--color-primary)]">Ver curso →</p>
      </CardContent></Card></Link>)}</div>}
  </div>;
}
