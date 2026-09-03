import Link from "next/link";
import { redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import { Badge, Card, CardContent, EmptyState, PageHeader } from "@/components/ui";
import { getClassesByCourse, getTeacherCourses } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";

export const dynamic = "force-dynamic";

export default async function DocenteClasesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const courses = await getTeacherCourses(user.id);
  const groups = await Promise.all(courses.map(async (course) => ({ course, classes: await getClassesByCourse(course.id) })));
  const total = groups.reduce((sum, group) => sum + group.classes.length, 0);

  return (
    <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
      <PageHeader eyebrow="Panel docente" title="Clases" description="Todas las clases de tus cursos asignados, agrupadas por contexto." metadata={<Badge tone="info">{total} {total === 1 ? "clase" : "clases"}</Badge>} />
      {groups.length === 0 ? (
        <EmptyState icon="school" title="No tenés cursos asignados" description="Cuando un administrador te asigne un curso, sus clases aparecerán aquí." />
      ) : (
        <div className="space-y-10">
          {groups.map(({ course, classes }) => (
            <section key={course.id} aria-labelledby={`course-${course.id}`} className="space-y-4">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div><h2 id={`course-${course.id}`} className="font-headline text-2xl font-bold">{course.title}</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{classes.length} {classes.length === 1 ? "clase" : "clases"}</p></div>
                <Link href={`/docentes/cursos/${course.id}/clases/nueva`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>Nueva clase</Link>
              </div>
              {classes.length === 0 ? (
                <EmptyState icon="menu_book" title="Sin clases" description="Programá la primera clase de este curso." action={<Link href={`/docentes/cursos/${course.id}/clases/nueva`} className="font-bold text-[var(--color-primary)]">Programar clase</Link>} />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {classes.map((classItem) => (
                    <Link key={classItem.id} href={`/docentes/cursos/${course.id}/clases/${classItem.id}`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4">
                      <Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent>
                        <h3 className="font-headline text-xl font-bold">{classItem.title}</h3>
                        <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">{classItem.date ? <FormattedDate date={classItem.date} showTime /> : "Sin fecha programada"}</p>
                        <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--color-primary)]">Gestionar <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></span>
                      </CardContent></Card>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
