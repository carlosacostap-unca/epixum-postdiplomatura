import Link from "next/link";
import { getAllCourses, getUserParticipationSummaries, getUsers } from "@/lib/data";
import { Badge, Card, CardContent, DataTable, EmptyState, PageHeader, type DataColumn } from "@/components/ui";
import FormattedDate from "@/components/FormattedDate";
import type { Course } from "@/types";

export default async function AdminDashboardPage() {
  const [courses, users, summaries] = await Promise.all([getAllCourses(), getUsers(), getUserParticipationSummaries()]);
  const activeCourses = courses.filter(course => course.status === "en curso");
  const drafts = courses.filter(course => course.status === "borrador");
  const stats = [
    { label: "En curso", value: activeCourses.length, href: "/admin/courses?status=en%20curso" },
    { label: "Borradores", value: drafts.length, href: "/admin/courses?status=borrador" },
    { label: "Docentes", value: users.filter(user => summaries[user.id]?.teaching.length).length, href: "/admin/users?role=docente" },
    { label: "Estudiantes", value: users.filter(user => summaries[user.id]?.studying.length).length, href: "/admin/users?role=estudiante" },
  ];
  const columns: DataColumn<Course>[] = [
    { id: "course", header: "Curso", render: course => <div><p className="font-semibold">{course.title}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">{course.expand?.teachers?.map(teacher => teacher.name || teacher.username).join(", ") || "Sin docente asignado"}</p></div> },
    { id: "status", header: "Estado", render: course => <Badge tone="success">{course.status}</Badge> },
    { id: "start", header: "Inicio", render: course => course.startDate ? <FormattedDate date={course.startDate} /> : "Sin fecha" },
    { id: "end", header: "Fin", render: course => course.endDate ? <FormattedDate date={course.endDate} /> : "Sin fecha" },
    { id: "actions", header: "Acciones", render: course => <Link href={`/admin/courses/${course.id}`} className="font-semibold text-[var(--color-primary)] hover:underline">Administrar</Link> },
  ];

  return <div className="page-container space-y-6">
    <PageHeader title="Inicio" actions={<Link href="/admin/courses/new" className="inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-3 py-2 font-semibold text-[var(--color-on-primary)]"><span className="material-symbols-outlined text-base" aria-hidden="true">add</span>Nuevo curso</Link>} />
    <section className="admin-overview-stats" aria-label="Resumen operativo">
      {stats.map(stat => <Link key={stat.label} href={stat.href} className="admin-overview-stat"><strong>{stat.value}</strong><span>{stat.label}</span></Link>)}
    </section>
    <section aria-labelledby="admin-drafts-title">
      <Card><CardContent>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 id="admin-drafts-title" className="font-semibold">Por completar</h2><Link href="/admin/courses?status=borrador" aria-label="Ver todos los borradores"><Badge tone={drafts.length ? "warning" : "neutral"}>{drafts.length} borradores</Badge></Link></div>
        {drafts.length ? <ul className="admin-draft-list">{drafts.slice(0, 4).map(course => <li key={course.id}><div><h3>{course.title}</h3><p>{course.teachers?.length ? "Revisar configuración." : "Asignar docentes y revisar configuración."}</p></div><Link href={`/admin/courses/${course.id}`}>Continuar<span className="material-symbols-outlined text-base" aria-hidden="true">arrow_forward</span></Link></li>)}</ul> : <p className="py-2 text-xs text-[var(--color-text-muted)]">No hay cursos pendientes de configuración.</p>}
      </CardContent></Card>
    </section>
    <section aria-labelledby="admin-active-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="admin-active-title" className="font-semibold">Cursos en curso</h2><Link href="/admin/courses" className="inline-flex items-center gap-2 text-[var(--color-primary)]">Ver todos<span className="material-symbols-outlined text-base" aria-hidden="true">arrow_forward</span></Link></div>
      <DataTable ariaLabel="Cursos en curso" items={activeCourses} columns={columns} getKey={course => course.id} empty={<EmptyState title="Sin cursos en curso" description="Los cursos activos aparecerán acá. Podés comenzar creando un borrador." action={<Link href="/admin/courses/new" className="inline-flex items-center text-[var(--color-primary)]">Crear curso</Link>} />} />
    </section>
  </div>;
}
