import Link from "next/link";
import { redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { getClass, getCourse, getLinks } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import ResourceList from "./ResourceList";

export default async function TeacherClassManagementPage({ params }: { params: Promise<{ id: string; classId: string }> }) {
  const { id, classId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await getCourse(id);
  if (!course?.teachers?.includes(user.id)) redirect("/docentes");
  const classData = await getClass(classId);
  if (classData.course !== course.id) redirect(`/docentes/cursos/${course.id}#clases`);
  const links = await getLinks(classData.id, "class");

  return (
    <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
      <TeacherCourseContext
        course={course}
        current="clases"
        title={classData.title}
        description={classData.date ? <>Programada para <FormattedDate date={classData.date} showTime /></> : "Clase sin fecha programada."}
        actions={<Link href={`/docentes/cursos/${course.id}/clases/${classData.id}/editar`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-surface-container-highest)] px-5 py-2.5 text-sm font-bold"><span className="material-symbols-outlined text-lg" aria-hidden="true">edit</span>Editar clase</Link>}
      />

      <section aria-labelledby="class-description-title">
        <Card><CardContent>
          <h2 id="class-description-title" className="font-headline text-2xl font-bold">Descripción de la clase</h2>
          {classData.description ? <div className="prose prose-invert mt-5 max-w-none text-[var(--color-on-surface-variant)]" dangerouslySetInnerHTML={{ __html: classData.description }} /> : <EmptyState className="mt-5" icon="description" title="Sin descripción" description="Editá la clase para añadir objetivos o un resumen de la sesión." action={<Link href={`/docentes/cursos/${course.id}/clases/${classData.id}/editar`} className="font-bold text-[var(--color-primary)]">Editar clase</Link>} />}
        </CardContent></Card>
      </section>

      <ResourceList links={links} classId={classData.id} courseId={course.id} />
    </div>
  );
}
