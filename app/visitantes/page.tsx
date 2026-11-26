import Link from 'next/link';
import { Card, CardContent, EmptyState, PageHeader } from '@/components/ui';
import { getVisitingTeacherCourses } from '@/lib/course-visiting-teacher-data';

export default async function VisitingTeacherCoursesPage() {
  const courses = await getVisitingTeacherCourses();
  return <div className="page-container space-y-8">
    <PageHeader eyebrow="Docencia visitante" title="Mis cursos" description="Consultá los cursos que tenés asignados en modo de solo lectura." />
    {courses.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {courses.map(course => <Link key={course.id} href={`/visitantes/cursos/${course.id}`}>
        <Card className="h-full"><CardContent>
          <h2 className="font-headline text-xl font-bold">{course.title}</h2>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">{course.status}</p>
        </CardContent></Card>
      </Link>)}
    </div> : <EmptyState icon="visibility" title="No tenés cursos asignados como docente visitante" description="Ingresá con el correo de la cuenta a la que se asignó el curso." />}
  </div>;
}
