import Link from "next/link";
import { redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import { StudentCourseContext } from "@/components/course/StudentCourseContext";
import { Card, CardContent, EmptyState } from "@/components/ui";
import { getClass, getCourse, getLinks, isStudentEnrolled, studentCanAccessCourseContent } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import StudentResourceList from "./StudentResourceList";

export const dynamic = "force-dynamic";

export default async function EstudianteClassPage({ params }: { params: Promise<{ id: string; classId: string }> }) {
  const { id, classId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "estudiante") redirect("/");
  const course = await getCourse(id);
  if (!course || !(await isStudentEnrolled(course.id, user.id))) redirect("/estudiantes");
  const classData = await getClass(classId).catch(() => null);
  if (!classData || classData.course !== course.id || !(await studentCanAccessCourseContent(course, classData.week))) redirect(`/estudiantes/cursos/${course.id}${course.organizationMode === "semanal" ? "#semanas" : "#clases"}`);
  const links = await getLinks(classData.id, "class");
  return <div className="w-full space-y-10 p-6 md:p-10 xl:p-12"><StudentCourseContext course={course} current="clases" title={classData.title} description={classData.date ? <>Clase programada para <FormattedDate date={classData.date} showTime /></> : "Clase disponible sin fecha programada."} /><Card><CardContent><h2 className="font-headline text-2xl font-bold">Contenido de la clase</h2>{classData.description ? <div className="prose prose-invert mt-5 max-w-none text-[var(--color-on-surface-variant)]" dangerouslySetInnerHTML={{ __html: classData.description }} /> : <EmptyState className="mt-5" icon="description" title="Sin descripción" description="El docente todavía no añadió una descripción para esta clase." />}</CardContent></Card><StudentResourceList links={links} /><Card><CardContent className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><h2 className="font-headline text-xl font-bold">¿Tenés una duda?</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Creá una consulta vinculada a esta clase.</p></div><Link href={`/estudiantes/cursos/${course.id}/consultas/nueva?classId=${classData.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-surface-container-highest)] px-5 py-2.5 text-sm font-bold">Hacer una consulta</Link></CardContent></Card></div>;
}
