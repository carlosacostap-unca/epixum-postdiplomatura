import Link from "next/link";
import { getAllCourses, getUserParticipationSummaries, getUsers } from "@/lib/data";
import { PageHeader, StatCard } from "@/components/ui";

export default async function AdminDashboardPage() {
  const [courses, users, summaries] = await Promise.all([getAllCourses(), getUsers(), getUserParticipationSummaries()]);
  const activeCourses = courses.filter((course) => course.status === "en curso").length;
  const draftCourses = courses.filter((course) => course.status === "borrador").length;
  const teachers = users.filter((user) => summaries[user.id]?.teaching.length).length;
  const students = users.filter((user) => summaries[user.id]?.studying.length).length;

  return (
    <div className="p-6 md:p-10 xl:p-12">
      <PageHeader eyebrow="Administración" title="Estado de la plataforma" description="Accedé rápidamente a las áreas que requieren gestión." actions={<Link href="/admin/courses/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]"><span className="material-symbols-outlined" aria-hidden="true">add</span>Nuevo curso</Link>} />
      <section aria-label="Resumen operativo" className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/admin/courses?status=en%20curso" label="Cursos activos" value={activeCourses} icon="play_circle" tone="primary" description={`${courses.length} cursos totales`} />
        <StatCard href="/admin/courses?status=borrador" label="Borradores" value={draftCourses} icon="draft" tone={draftCourses ? "warning" : "neutral"} description="Pendientes de publicación" />
        <StatCard href="/admin/users?role=docente" label="Docentes" value={teachers} icon="co_present" tone="info" description="Asignados al menos a un curso" />
        <StatCard href="/admin/users?role=estudiante" label="Estudiantes" value={students} icon="school" description={`${users.length} usuarios totales`} />
      </section>
    </div>
  );
}
