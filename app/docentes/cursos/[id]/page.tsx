import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import CourseKeyManager from "@/components/CourseKeyManager";
import { TeacherCourseContext } from "@/components/course/TeacherCourseContext";
import TeacherWeeklyCourseManager from "@/components/course/TeacherWeeklyCourseManager";
import { Badge, Card, CardContent, EmptyState, StatCard } from "@/components/ui";
import { getInquiries } from "@/lib/actions-inquiries";
import {
  getAssignmentsByCourse,
  getClassesByCourse,
  getCourse,
  getCourseOrganizationData,
  getCourseStudents,
  getDeliveries,
} from "@/lib/data";
import { getCurrentUser } from "@/lib/pocketbase-server";
import { redirect } from "next/navigation";

const primaryLink = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]";

function plainText(value?: string) {
  return value?.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default async function TeacherCourseManagementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const course = await getCourse(id);
  if (!course?.teachers?.includes(user.id)) redirect("/docentes");

  const weekly = course.organizationMode === "semanal";
  const [organization, students] = await Promise.all([
    weekly ? getCourseOrganizationData(course) : null,
    getCourseStudents(course.id),
  ]);
  const [classes, assignments, inquiries] = organization
    ? [organization.allClasses, organization.allAssignments, organization.allInquiries]
    : await Promise.all([
        getClassesByCourse(course.id),
        getAssignmentsByCourse(course.id),
        getInquiries({ courseId: course.id }),
      ]);
  const deliveries = (await Promise.all(assignments.map((assignment) => getDeliveries(assignment.id)))).flat();
  const pendingDeliveries = deliveries.filter((delivery) => delivery.status !== "published");
  const pendingInquiries = inquiries.filter((inquiry) => inquiry.status === "Pendiente");

  return (
    <div className="w-full space-y-12 p-6 md:p-10 xl:p-12">
      <TeacherCourseContext
        course={course}
        current="resumen"
        description={plainText(course.description) || "Gestioná el contenido, la actividad y el acceso del curso."}
      />

      <section aria-label="Resumen del curso" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Entregas por revisar" value={pendingDeliveries.length} icon="rate_review" tone={pendingDeliveries.length ? "warning" : "neutral"} href="#trabajos" />
        <StatCard label="Consultas pendientes" value={pendingInquiries.length} icon="forum" tone={pendingInquiries.length ? "warning" : "neutral"} href={`/docentes/cursos/${course.id}/consultas?estado=Pendiente`} />
        <StatCard label="Clases" value={classes.length} icon="menu_book" href={weekly ? "#semanas" : "#clases"} />
        <StatCard label="Estudiantes" value={students.length} icon="group" href="#estudiantes" />
      </section>

      {(pendingDeliveries.length > 0 || pendingInquiries.length > 0) && (
        <section aria-labelledby="course-pending-title" className="space-y-5">
          <div>
            <h2 id="course-pending-title" className="font-headline text-2xl font-bold">Requiere atención</h2>
            <p className="mt-1 text-[var(--color-on-surface-variant)]">Pendientes de este curso, antes del contenido general.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingDeliveries.slice(0, 3).map((delivery) => {
              const assignment = assignments.find((item) => item.id === delivery.assignment);
              return (
                <Link key={delivery.id} href={`/docentes/cursos/${course.id}/tps/${delivery.assignment}#entregas`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4">
                  <Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent>
                    <Badge tone={delivery.status === "draft" ? "info" : "warning"}>{delivery.status === "draft" ? "Evaluación en borrador" : "Sin evaluar"}</Badge>
                    <h3 className="mt-4 font-bold">{assignment?.title || "Trabajo práctico"}</h3>
                    <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{delivery.expand?.student?.name || "Estudiante"} · <FormattedDate date={delivery.created} /></p>
                  </CardContent></Card>
                </Link>
              );
            })}
            {pendingInquiries.slice(0, 3).map((inquiry) => (
              <Link key={inquiry.id} href={`/docentes/cursos/${course.id}/consultas/${inquiry.id}`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4">
                <Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent>
                  <Badge tone="warning">Consulta pendiente</Badge>
                  <h3 className="mt-4 font-bold">{inquiry.title}</h3>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{inquiry.expand?.author?.name || "Estudiante"} · <FormattedDate date={inquiry.created} /></p>
                </CardContent></Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {organization ? (
        <TeacherWeeklyCourseManager courseId={course.id} weeks={organization.weeks} groups={organization.groups} unassigned={organization.unassigned} />
      ) : <><section id="clases" aria-labelledby="classes-title" className="scroll-mt-6 space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h2 id="classes-title" className="font-headline text-2xl font-bold md:text-3xl">Clases</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Sesiones y materiales del curso.</p></div>
          <Link href={`/docentes/cursos/${course.id}/clases/nueva`} className={primaryLink}><span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>Nueva clase</Link>
        </div>
        {classes.length === 0 ? (
          <EmptyState icon="menu_book" title="Todavía no hay clases" description="Programá la primera clase y después agregá sus recursos." action={<Link href={`/docentes/cursos/${course.id}/clases/nueva`} className={primaryLink}>Programar clase</Link>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {classes.map((classItem) => (
              <Link key={classItem.id} href={`/docentes/cursos/${course.id}/clases/${classItem.id}`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4">
                <Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent>
                  <div className="flex items-start justify-between gap-4"><h3 className="font-headline text-xl font-bold">{classItem.title}</h3><span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">arrow_forward</span></div>
                  <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">{classItem.date ? <FormattedDate date={classItem.date} showTime /> : "Sin fecha programada"}</p>
                </CardContent></Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section id="trabajos" aria-labelledby="assignments-title" className="scroll-mt-6 space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h2 id="assignments-title" className="font-headline text-2xl font-bold md:text-3xl">Trabajos prácticos</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Enunciados, entregas y evaluaciones.</p></div>
          <Link href={`/docentes/cursos/${course.id}/tps/nuevo`} className={primaryLink}><span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>Nuevo trabajo</Link>
        </div>
        {assignments.length === 0 ? (
          <EmptyState icon="assignment" title="Todavía no hay trabajos" description="Creá el primer trabajo práctico y definí su fecha límite." action={<Link href={`/docentes/cursos/${course.id}/tps/nuevo`} className={primaryLink}>Crear trabajo</Link>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {assignments.map((assignment) => {
              const assignmentDeliveries = deliveries.filter((delivery) => delivery.assignment === assignment.id);
              const pendingCount = assignmentDeliveries.filter((delivery) => delivery.status !== "published").length;
              return (
                <Link key={assignment.id} href={`/docentes/cursos/${course.id}/tps/${assignment.id}`} className="rounded-[var(--epixum-radius-xl)] focus-visible:outline-offset-4">
                  <Card className="h-full transition-colors hover:bg-[var(--color-surface-container)]"><CardContent>
                    <div className="flex items-start justify-between gap-4"><h3 className="font-headline text-xl font-bold">{assignment.title}</h3>{pendingCount > 0 && <Badge tone="warning">{pendingCount} por revisar</Badge>}</div>
                    <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">{assignment.dueDate ? <>Vence <FormattedDate date={assignment.dueDate} showTime /></> : "Sin fecha límite"}</p>
                    <p className="mt-2 text-sm font-medium">{assignmentDeliveries.length} {assignmentDeliveries.length === 1 ? "entrega" : "entregas"}</p>
                  </CardContent></Card>
                </Link>
              );
            })}
          </div>
        )}
      </section></>}

      <div className="grid gap-8 xl:grid-cols-2">
        <section id="estudiantes" aria-labelledby="students-title" className="scroll-mt-6 space-y-5">
          <div><h2 id="students-title" className="font-headline text-2xl font-bold">Estudiantes</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Matrículas vigentes del curso.</p></div>
          {students.length === 0 ? (
            <EmptyState icon="group_off" title="Sin estudiantes matriculados" description="Compartí una clave de acceso para habilitar la matrícula inmediata." />
          ) : (
            <Card><CardContent className="divide-y divide-[var(--color-outline-variant)] py-2">
              {students.map((student) => (
                <div key={student.id} className="flex items-center gap-4 py-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 font-bold text-[var(--color-primary)]" aria-hidden="true">{(student.firstName || student.name || "E").charAt(0).toUpperCase()}</span>
                  <div className="min-w-0"><p className="truncate font-bold">{[student.firstName || student.name, student.lastName].filter(Boolean).join(" ")}</p><p className="truncate text-sm text-[var(--color-on-surface-variant)]">{student.email || "Correo no visible"}</p></div>
                </div>
              ))}
            </CardContent></Card>
          )}
        </section>

        <section id="acceso" aria-labelledby="access-title" className="scroll-mt-6 space-y-5">
          <div><h2 id="access-title" className="font-headline text-2xl font-bold">Acceso al curso</h2><p className="mt-1 text-[var(--color-on-surface-variant)]">Gestioná la credencial sin exponer la versión almacenada.</p></div>
          <CourseKeyManager courseId={course.id} enrollmentMode={course.enrollmentMode || "clave"} />
        </section>
      </div>
    </div>
  );
}
