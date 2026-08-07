import Link from "next/link";
import { redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import JoinCourseForm from "@/components/JoinCourseForm";
import PendingCourseInvitations from "@/components/PendingCourseInvitations";
import { Badge, Card, CardContent, EmptyState, Field, PageHeader, Select, StatCard } from "@/components/ui";
import { getStudentDashboardData, getStudentPendingInvitations } from "@/lib/data";
import { getDeadlineState } from "@/lib/student-learning";
import { getCurrentUser } from "@/lib/pocketbase-server";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ buscar?: string; estado?: string }>;

export default async function EstudiantesDashboard({ searchParams }: { searchParams: SearchParams }) {
  const [user, query] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user || user.role !== "estudiante") redirect("/");
  const [dashboard, pendingInvitations] = await Promise.all([
    getStudentDashboardData(user.id),
    getStudentPendingInvitations(),
  ]);
  const search = query.buscar?.trim().toLocaleLowerCase("es") || "";
  const status = query.estado === "en curso" || query.estado === "finalizado" ? query.estado : "all";
  const filteredCourses = dashboard.courses.filter((course) => (!search || course.title.toLocaleLowerCase("es").includes(search)) && (status === "all" || course.status === status));
  const firstName = user.firstName || user.name?.split(" ")[0] || "Estudiante";
  const hasPending = dashboard.pendingAssignmentCount + dashboard.pendingInquiryCount > 0;

  const nextAssignment = dashboard.pendingAssignments[0];
  const nextClass = dashboard.nextClass;
  const nextAssignmentTime = nextAssignment?.dueDate ? new Date(nextAssignment.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const nextClassTime = nextClass?.date ? new Date(nextClass.date).getTime() : Number.POSITIVE_INFINITY;
  const continueItem = nextAssignment && nextAssignmentTime <= nextClassTime
    ? { href: `/estudiantes/cursos/${nextAssignment.course}/tps/${nextAssignment.id}`, label: "Trabajo pendiente", title: nextAssignment.title, course: nextAssignment.expand?.course?.title, date: nextAssignment.dueDate, icon: "assignment" }
    : nextClass
      ? { href: `/estudiantes/cursos/${nextClass.course}/clases/${nextClass.id}`, label: "Próxima clase", title: nextClass.title, course: nextClass.expand?.course?.title, date: nextClass.date, icon: "play_circle" }
      : dashboard.courses[0]
        ? { href: `/estudiantes/cursos/${dashboard.courses[0].id}`, label: "Continuar aprendiendo", title: dashboard.courses[0].title, course: undefined, date: undefined, icon: "school" }
        : null;

  return (
    <div className="w-full space-y-10 p-6 md:p-10 xl:p-12">
      <PageHeader eyebrow="Panel estudiante" title={<>Hola, <span className="text-[var(--color-primary)]">{firstName}</span></>} description="Retomá tu próxima actividad o explorá los cursos en los que estás matriculado." actions={<JoinCourseForm />} />

      <section aria-label="Resumen académico" className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Mis cursos" value={dashboard.courses.length} icon="school" tone="primary" href="#mis-cursos" />
        <StatCard label="Trabajos pendientes" value={dashboard.pendingAssignmentCount} icon="assignment" tone={dashboard.pendingAssignmentCount ? "warning" : "neutral"} href="#proximos-trabajos" />
        <StatCard label="Mis consultas pendientes" value={dashboard.pendingInquiryCount} icon="forum" tone={dashboard.pendingInquiryCount ? "info" : "neutral"} />
      </section>

      <PendingCourseInvitations invitations={pendingInvitations} />

      {continueItem ? (
        <section aria-labelledby="continue-title">
          <Link href={continueItem.href} className="group block rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4">
            <Card className="overflow-hidden bg-[linear-gradient(135deg,var(--color-surface-container-low),color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-container-low)))] transition-colors group-hover:bg-[var(--color-surface-container)]">
              <CardContent className="flex flex-col justify-between gap-7 md:flex-row md:items-center md:p-10">
                <div className="flex min-w-0 items-start gap-5"><span className="material-symbols-outlined text-4xl text-[var(--color-primary)]" aria-hidden="true">{continueItem.icon}</span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-primary)]">{continueItem.label}</p><h2 id="continue-title" className="mt-2 font-headline text-2xl font-bold md:text-3xl">{continueItem.title}</h2>{continueItem.course && <p className="mt-2 text-[var(--color-on-surface-variant)]">{continueItem.course}</p>}{continueItem.date && <p className="mt-2 text-sm font-medium text-[var(--color-on-surface-variant)]"><FormattedDate date={continueItem.date} showTime /></p>}</div></div>
                <span className="inline-flex shrink-0 items-center gap-2 font-bold text-[var(--color-primary)]">Continuar <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></span>
              </CardContent>
            </Card>
          </Link>
        </section>
      ) : (
        <EmptyState icon="school" title={pendingInvitations.length ? "Activá tu invitación" : "Empezá sumándote a un curso"} description={pendingInvitations.length ? "Ingresá la contraseña desde Invitaciones pendientes para sumar el curso a tu matrícula." : "Usá la clave que te compartió el docente desde el botón Sumarme a un curso."} />
      )}

      {!hasPending && dashboard.courses.length > 0 && <EmptyState icon="task_alt" title="Estás al día" description="No tenés trabajos sin entregar ni consultas propias pendientes. Podés continuar con la próxima clase." />}

      {dashboard.pendingAssignments.length > 0 && (
        <section id="proximos-trabajos" aria-labelledby="pending-assignments-title" className="scroll-mt-6 space-y-5">
          <div><h2 id="pending-assignments-title" className="font-headline text-2xl font-bold">Próximos trabajos</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Vigentes y todavía sin entrega.</p></div>
          <div className="grid gap-4 md:grid-cols-2">
            {dashboard.pendingAssignments.map((assignment) => {
              const deadline = getDeadlineState(assignment.dueDate);
              return <Link key={assignment.id} href={`/estudiantes/cursos/${assignment.course}/tps/${assignment.id}`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4"><Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent><div className="flex items-start justify-between gap-4"><Badge tone={deadline === "due-soon" ? "warning" : "info"}>{deadline === "due-soon" ? "Vence en menos de 72 h" : "Pendiente"}</Badge><span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">arrow_forward</span></div><h3 className="mt-4 font-headline text-xl font-bold">{assignment.title}</h3><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{assignment.expand?.course?.title}</p>{assignment.dueDate && <p className="mt-3 text-sm font-medium"><FormattedDate date={assignment.dueDate} showTime /></p>}</CardContent></Card></Link>;
            })}
          </div>
        </section>
      )}

      {dashboard.pendingInquiries.length > 0 && (
        <section aria-labelledby="my-inquiries-title" className="space-y-5">
          <div><h2 id="my-inquiries-title" className="font-headline text-2xl font-bold">Retomar mis consultas</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Conversaciones propias que siguen pendientes.</p></div>
          <div className="space-y-3">{dashboard.pendingInquiries.map((inquiry) => <Link key={inquiry.id} href={`/estudiantes/cursos/${inquiry.course}/consultas/${inquiry.id}`} className="block rounded-[var(--epixum-radius-lg)] focus-visible:outline-offset-4"><Card className="transition-colors hover:bg-[var(--color-surface-container)]"><CardContent className="flex items-center justify-between gap-4 py-5"><div className="min-w-0"><p className="truncate font-bold">{inquiry.title}</p><p className="mt-1 truncate text-sm text-[var(--color-on-surface-variant)]">{inquiry.expand?.course?.title || "Curso"} · <FormattedDate date={inquiry.updated || inquiry.created} showTime /></p></div><Badge tone="warning">Pendiente</Badge></CardContent></Card></Link>)}</div>
        </section>
      )}

      <section id="mis-cursos" aria-labelledby="my-courses-title" className="scroll-mt-6 space-y-5">
        <div><h2 id="my-courses-title" className="font-headline text-2xl font-bold md:text-3xl">Mis cursos</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Solo aparecen los cursos en los que estás matriculado.</p></div>
        {dashboard.courses.length > 0 && <form method="get" className="grid gap-4 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-5 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end"><Field id="course-search" label="Buscar curso"><input type="search" name="buscar" defaultValue={query.buscar} placeholder="Título del curso" className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5" /></Field><Field id="course-status" label="Estado"><Select name="estado" defaultValue={status}><option value="all">Todos</option><option value="en curso">En curso</option><option value="finalizado">Finalizados</option></Select></Field><button type="submit" className="min-h-11 rounded-full bg-[var(--color-surface-container-highest)] px-5 py-2.5 text-sm font-bold">Aplicar filtros</button></form>}
        <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{filteredCourses.length} {filteredCourses.length === 1 ? "curso encontrado" : "cursos encontrados"}</p>
        {filteredCourses.length === 0 ? (
          <EmptyState icon={dashboard.courses.length ? "filter_alt_off" : "school"} title={dashboard.courses.length ? "No hay coincidencias" : "Todavía no tenés cursos"} description={dashboard.courses.length ? "Probá otro título o estado." : pendingInvitations.length ? "Activá una invitación pendiente o usá la clave de un curso tradicional." : "Pedile una clave al docente y usá Sumarme a un curso."} action={dashboard.courses.length ? <Link href="/estudiantes#mis-cursos" className="font-bold text-[var(--color-primary)]">Limpiar filtros</Link> : undefined} />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => { const activity = dashboard.nextActivityByCourse[course.id]; return <Link key={course.id} href={`/estudiantes/cursos/${course.id}`} className="group rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4"><Card className="flex h-full flex-col transition-colors group-hover:bg-[var(--color-surface-container)]"><CardContent className="flex flex-1 flex-col"><div className="flex items-start justify-between gap-4"><span className="material-symbols-outlined text-3xl text-[var(--color-primary)]" aria-hidden="true">school</span><Badge tone={course.status === "en curso" ? "success" : "neutral"}>{course.status}</Badge></div><h3 className="mt-5 font-headline text-xl font-bold group-hover:text-[var(--color-primary)]">{course.title}</h3><div className="mt-3 line-clamp-3 text-sm text-[var(--color-on-surface-variant)]" dangerouslySetInnerHTML={{ __html: course.description || "Sin descripción." }} />{activity ? <div className="mt-6 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-highest)] p-3"><p className="text-xs font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Próxima actividad</p><p className="mt-1 truncate text-sm font-bold">{activity.title}</p>{activity.date && <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]"><FormattedDate date={activity.date} showTime /></p>}</div> : <p className="mt-6 text-sm text-[var(--color-on-surface-variant)]">Sin próximas actividades programadas.</p>}<span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold">Abrir curso <span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_forward</span></span></CardContent></Card></Link>; })}
          </div>
        )}
      </section>
    </div>
  );
}
