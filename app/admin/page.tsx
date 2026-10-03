import Link from "next/link";
import { getAllCourses, getUserParticipationSummaries, getUsers } from "@/lib/data";
import { Badge, Card, CardContent, EmptyState, PageHeader, StatCard } from "@/components/ui";

export default async function AdminDashboardPage() {
  const [courses, users, summaries] = await Promise.all([getAllCourses(), getUsers(), getUserParticipationSummaries()]);
  const activeCourses = courses.filter((course) => course.status === "en curso").length;
  const draftCourses = courses.filter((course) => course.status === "borrador").length;
  const teachers = users.filter((user) => summaries[user.id]?.teaching.length).length;
  const students = users.filter((user) => summaries[user.id]?.studying.length).length;

  return (
    <div className="page-container space-y-8">
      <PageHeader eyebrow="Administración" title="Estado de la plataforma" description="Accedé rápidamente a las áreas que requieren gestión." actions={<Link href="/admin/courses/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]"><span className="material-symbols-outlined" aria-hidden="true">add</span>Nuevo curso</Link>} />
      <section aria-label="Resumen operativo" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/admin/courses?status=en%20curso" label="Cursos activos" value={activeCourses} icon="play_circle" tone="primary" description={`${courses.length} cursos totales`} />
        <StatCard href="/admin/courses?status=borrador" label="Borradores" value={draftCourses} icon="draft" tone={draftCourses ? "warning" : "neutral"} description="Pendientes de publicación" />
        <StatCard href="/admin/users?role=docente" label="Docentes" value={teachers} icon="co_present" tone="info" description="Asignados al menos a un curso" />
        <StatCard href="/admin/users?role=estudiante" label="Estudiantes" value={students} icon="school" description={`${users.length} usuarios totales`} />
      </section>
      <section aria-labelledby="admin-tasks-title" className="space-y-4">
        <h2 id="admin-tasks-title" className="font-headline text-xl font-bold">Gestión del campus</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[{ href: "/admin/courses", icon: "school", title: "Cursos y participantes", description: "Organizá el catálogo, asigná docentes y administrá matrículas e invitaciones." }, { href: "/admin/users", icon: "group", title: "Usuarios y permisos", description: "Encontrá personas, consultá sus cursos y gestioná el acceso administrativo." }].map((item) => <Link key={item.href} href={item.href} className="group rounded-[var(--epixum-radius-xl)]"><Card className="h-full transition-colors group-hover:bg-[var(--color-surface-container)]"><CardContent className="flex items-start gap-4"><span className="material-symbols-outlined flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]" aria-hidden="true">{item.icon}</span><div className="min-w-0 flex-1"><h3 className="font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">{item.description}</p></div><span className="material-symbols-outlined text-xl text-[var(--color-text-muted)]" aria-hidden="true">arrow_forward</span></CardContent></Card></Link>)}
        </div>
      </section>
      <section aria-labelledby="admin-courses-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="admin-courses-title" className="font-headline text-xl font-bold">Cursos en preparación</h2><Link href="/admin/courses?status=borrador" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">Ver borradores<span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></Link></div>
        {draftCourses ? <div className="grid gap-3 md:grid-cols-2">{courses.filter((course) => course.status === "borrador").slice(0, 4).map((course) => <Link key={course.id} href={`/admin/courses/${course.id}`} className="rounded-[var(--epixum-radius-xl)]"><Card className="transition-colors hover:bg-[var(--color-surface-container)]"><CardContent className="flex items-center justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold">{course.title}</h3><p className="mt-1 text-sm text-[var(--color-text-muted)]">Completar configuración</p></div><Badge tone="warning">Borrador</Badge></CardContent></Card></Link>)}</div> : <EmptyState icon="task_alt" title="Sin cursos en preparación" description="Los cursos que crees como borrador aparecerán acá para continuar su configuración." />}
      </section>
    </div>
  );
}
