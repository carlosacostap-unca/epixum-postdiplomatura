import Link from "next/link";
import { redirect } from "next/navigation";
import FormattedDate from "@/components/FormattedDate";
import { StudentCourseContext } from "@/components/course/StudentCourseContext";
import { Badge, Card, CardContent, EmptyState, StatCard } from "@/components/ui";
import { getInquiries } from "@/lib/actions-inquiries";
import { isWeekEffectivelyVisible } from "@/lib/course-weeks";
import { getAssignmentsByCourse, getClassesByCourse, getCourse, getCourseOrganizationData, getUserDelivery, isStudentEnrolled } from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { getDeadlineState } from "@/lib/student-learning";
import type { Assignment, Class, CourseWeek, Delivery, Inquiry } from "@/types";

export const dynamic = "force-dynamic";

function plainText(value?: string) { return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }

function ClassCard({ courseId, item, nextClass, now }: { courseId: string; item: Class; nextClass?: string; now: Date }) {
  const future = Boolean(item.date && new Date(item.date) >= now);
  return <Link href={`/estudiantes/cursos/${courseId}/clases/${item.id}`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4"><Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent><div className="flex items-start justify-between gap-4"><Badge tone={item.id === nextClass ? "success" : "neutral"}>{item.id === nextClass ? "Próxima" : future ? "Programada" : "Disponible"}</Badge><span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">arrow_forward</span></div><h3 className="mt-4 font-headline text-xl font-bold">{item.title}</h3><p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">{item.date ? <FormattedDate date={item.date} showTime /> : "Sin fecha"}</p></CardContent></Card></Link>;
}

function AssignmentCard({ courseId, assignment, delivery, now }: { courseId: string; assignment: Assignment; delivery?: Delivery | null; now: Date }) {
  const deadline = getDeadlineState(assignment.dueDate, now);
  const badge = delivery
    ? { tone: delivery.status === "published" ? "success" as const : "info" as const, label: delivery.status === "published" ? "Evaluado" : "Entregado" }
    : deadline === "overdue" ? { tone: "error" as const, label: "Vencido sin entrega" }
      : deadline === "due-soon" ? { tone: "warning" as const, label: "Vence en menos de 72 h" }
        : { tone: "neutral" as const, label: "Pendiente" };
  return <Link href={`/estudiantes/cursos/${courseId}/tps/${assignment.id}`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4"><Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent><div className="flex items-start justify-between gap-4"><Badge tone={badge.tone}>{badge.label}</Badge><span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">arrow_forward</span></div><h3 className="mt-4 font-headline text-xl font-bold">{assignment.title}</h3><p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">{assignment.dueDate ? <>Fecha límite: <FormattedDate date={assignment.dueDate} showTime /></> : "Sin fecha límite"}</p></CardContent></Card></Link>;
}

function WeekSection({ courseId, week, classes, assignments, inquiries, deliveryByAssignment, nextClass, now }: { courseId: string; week: CourseWeek; classes: Class[]; assignments: Assignment[]; inquiries: Inquiry[]; deliveryByAssignment: Map<string, Delivery | null>; nextClass?: string; now: Date }) {
  return <section aria-labelledby={`week-${week.id}`} className="space-y-6 rounded-[var(--epixum-radius-xl)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5 md:p-8"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="flex flex-wrap gap-2"><Badge tone="info">Semana {week.number}</Badge>{week.startDate || week.endDate ? <Badge>{week.startDate ? new Date(week.startDate).toLocaleDateString("es-AR") : ""}{week.startDate && week.endDate ? " — " : ""}{week.endDate ? new Date(week.endDate).toLocaleDateString("es-AR") : ""}</Badge> : null}</div><h2 id={`week-${week.id}`} className="mt-3 font-headline text-2xl font-bold">{week.title}</h2></div><Link href={`/estudiantes/cursos/${courseId}/consultas/nueva?semana=${week.id}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--color-surface-container-highest)] px-5 text-sm font-bold">Consultar sobre esta semana</Link></div>{classes.length ? <div className="space-y-4"><h3 className="font-headline text-xl font-bold">Clases</h3><div className="grid gap-4 md:grid-cols-2">{classes.map((item) => <ClassCard key={item.id} courseId={courseId} item={item} nextClass={nextClass} now={now} />)}</div></div> : null}{assignments.length ? <div className="space-y-4"><h3 className="font-headline text-xl font-bold">Trabajos prácticos</h3><div className="grid gap-4 md:grid-cols-2">{assignments.map((item) => <AssignmentCard key={item.id} courseId={courseId} assignment={item} delivery={deliveryByAssignment.get(item.id)} now={now} />)}</div></div> : null}{inquiries.length ? <Link href={`/estudiantes/cursos/${courseId}/consultas?semana=${week.id}`} className="inline-flex min-h-11 items-center gap-2 font-bold text-[var(--color-primary)]"><span className="material-symbols-outlined" aria-hidden="true">forum</span>{inquiries.length} {inquiries.length === 1 ? "consulta" : "consultas"} de esta semana</Link> : null}{classes.length + assignments.length + inquiries.length === 0 ? <p className="text-sm text-[var(--color-on-surface-variant)]">La semana está publicada, pero todavía no tiene contenido.</p> : null}</section>;
}

export default async function EstudianteCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const course = await getCourse(id);
  if (!course || !(await isStudentEnrolled(course.id, user.id))) redirect("/estudiantes");

  const weekly = course.organizationMode === "semanal";
  const organization = weekly ? await getCourseOrganizationData(course) : null;
  const [classes, assignments, inquiries] = organization
    ? [organization.classes, organization.assignments, organization.inquiries]
    : await Promise.all([
        getClassesByCourse(course.id),
        getAssignmentsByCourse(course.id),
        getInquiries({ courseId: course.id, authorId: user.id, status: "Pendiente", sort: "recent" }),
      ]);
  const pendingInquiries = organization ? inquiries.filter((item) => item.author === user.id && item.status === "Pendiente") : inquiries;
  const deliveries = await Promise.all(assignments.map((assignment) => getUserDelivery(assignment.id, user.id)));
  const deliveryByAssignment = new Map(assignments.map((assignment, index) => [assignment.id, deliveries[index]]));
  const now = new Date();
  const sortedClasses = [...classes].sort((a, b) => (a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY) - (b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY));
  const nextClass = sortedClasses.find((item) => item.date && new Date(item.date) >= now);
  const pendingAssignments = assignments.filter((assignment) => !deliveryByAssignment.get(assignment.id) && getDeadlineState(assignment.dueDate, now) !== "overdue").sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY) - (b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY));
  const nextAssignment = pendingAssignments[0];
  const nextClassTime = nextClass?.date ? new Date(nextClass.date).getTime() : Number.POSITIVE_INFINITY;
  const assignmentTime = nextAssignment?.dueDate ? new Date(nextAssignment.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const nextAction = nextAssignment && assignmentTime <= nextClassTime
    ? { href: `/estudiantes/cursos/${course.id}/tps/${nextAssignment.id}`, eyebrow: "Trabajo pendiente", title: nextAssignment.title, date: nextAssignment.dueDate, icon: "assignment" }
    : nextClass ? { href: `/estudiantes/cursos/${course.id}/clases/${nextClass.id}`, eyebrow: "Próxima clase", title: nextClass.title, date: nextClass.date, icon: "play_circle" } : null;

  const visibleClassIds = new Set(classes.map((item) => item.id));
  const visibleAssignmentIds = new Set(assignments.map((item) => item.id));
  const visibleInquiryIds = new Set(inquiries.map((item) => item.id));
  const visibleGroups = organization?.groups.filter((group) => isWeekEffectivelyVisible(group.week, now)).map((group) => ({
    ...group,
    classes: group.classes.filter((item) => visibleClassIds.has(item.id)),
    assignments: group.assignments.filter((item) => visibleAssignmentIds.has(item.id)),
    inquiries: group.inquiries.filter((item) => visibleInquiryIds.has(item.id)),
  })) || [];

  return <div className="w-full space-y-12 p-6 md:p-10 xl:p-12">
    <StudentCourseContext course={course} current="resumen" description={plainText(course.description) || "Clases, trabajos y consultas del curso."} />
    {nextAction ? <Link href={nextAction.href} className="group block rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4"><Card className="bg-[linear-gradient(135deg,var(--color-surface-container-low),color-mix(in_srgb,var(--color-primary)_10%,var(--color-surface-container-low)))] transition-colors group-hover:bg-[var(--color-surface-container)]"><CardContent className="flex flex-col justify-between gap-6 md:flex-row md:items-center md:p-9"><div className="flex items-start gap-5"><span className="material-symbols-outlined text-4xl text-[var(--color-primary)]" aria-hidden="true">{nextAction.icon}</span><div><p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">{nextAction.eyebrow}</p><h2 className="mt-2 font-headline text-2xl font-bold">{nextAction.title}</h2>{nextAction.date && <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]"><FormattedDate date={nextAction.date} showTime /></p>}</div></div><span className="inline-flex shrink-0 items-center gap-2 font-bold text-[var(--color-primary)]">Continuar <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span></span></CardContent></Card></Link> : <EmptyState icon="task_alt" title="Curso al día" description="No hay próximas clases ni trabajos pendientes programados." />}
    <section aria-label="Resumen del curso" className="grid gap-4 sm:grid-cols-3"><StatCard label="Clases" value={classes.length} icon="menu_book" href={weekly ? "#semanas" : "#clases"} /><StatCard label="Trabajos pendientes" value={pendingAssignments.length} icon="assignment" tone={pendingAssignments.length ? "warning" : "neutral"} href={weekly ? "#semanas" : "#trabajos"} /><StatCard label="Mis consultas pendientes" value={pendingInquiries.length} icon="forum" tone={pendingInquiries.length ? "info" : "neutral"} href={`/estudiantes/cursos/${course.id}/consultas?autor=mis-consultas&estado=Pendiente`} /></section>
    {weekly ? <section id="semanas" aria-labelledby="weeks-title" className="scroll-mt-6 space-y-6"><div><h2 id="weeks-title" className="font-headline text-2xl font-bold md:text-3xl">Semanas del curso</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Solo aparecen las semanas que el docente ya publicó.</p></div>{visibleGroups.length ? visibleGroups.map((group) => <WeekSection key={group.week.id} courseId={course.id} week={group.week} classes={group.classes} assignments={group.assignments} inquiries={group.inquiries} deliveryByAssignment={deliveryByAssignment} nextClass={nextClass?.id} now={now} />) : <EmptyState icon="calendar_view_week" title="Todavía no hay semanas publicadas" description="El contenido aparecerá cuando el docente publique la primera semana." />}</section> : <><section id="clases" aria-labelledby="classes-title" className="scroll-mt-6 space-y-5"><div><h2 id="classes-title" className="font-headline text-2xl font-bold md:text-3xl">Clases y materiales</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Abrí una clase para consultar su contenido y recursos.</p></div>{sortedClasses.length === 0 ? <EmptyState icon="menu_book" title="Todavía no hay clases" description="El contenido aparecerá cuando el docente publique la primera clase." /> : <div className="grid gap-4 md:grid-cols-2">{sortedClasses.map((item) => <ClassCard key={item.id} courseId={course.id} item={item} nextClass={nextClass?.id} now={now} />)}</div>}</section><section id="trabajos" aria-labelledby="assignments-title" className="scroll-mt-6 space-y-5"><div><h2 id="assignments-title" className="font-headline text-2xl font-bold md:text-3xl">Trabajos prácticos</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Revisá el plazo y el estado de tu entrega.</p></div>{assignments.length === 0 ? <EmptyState icon="assignment" title="Todavía no hay trabajos" description="Los trabajos prácticos aparecerán aquí cuando estén disponibles." /> : <div className="grid gap-4 md:grid-cols-2">{assignments.map((assignment) => <AssignmentCard key={assignment.id} courseId={course.id} assignment={assignment} delivery={deliveryByAssignment.get(assignment.id)} now={now} />)}</div>}</section></>}
  </div>;
}
