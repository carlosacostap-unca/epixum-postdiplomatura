import Link from "next/link";
import FormattedDate from "@/components/FormattedDate";
import JoinCourseForm from "@/components/JoinCourseForm";
import PendingCourseInvitations from "@/components/PendingCourseInvitations";
import { Badge, EmptyState } from "@/components/ui";
import type { StudentDashboardData } from "@/lib/data";
import type { CourseEnrollmentInvitation } from "@/types";
import { getDeadlineState } from "@/lib/student-learning";
import { StudentAction, StudentIcon, StudentInquiries, StudentMetrics, StudentPanel, studentPlainText } from "./StudentLearningUI";

export default function StudentDashboard({ dashboard, invitations, firstName, query = "", status = "all" }: { dashboard: StudentDashboardData; invitations: CourseEnrollmentInvitation[]; firstName: string; query?: string; status?: "all" | "en curso" | "finalizado" }) {
  const filteredCourses = dashboard.courses.filter(course => (!query || course.title.toLocaleLowerCase("es").includes(query.trim().toLocaleLowerCase("es"))) && (status === "all" || course.status === status));
  const nextAssignment = dashboard.pendingAssignments[0];
  const nextClass = dashboard.nextClass;
  const assignmentTime = nextAssignment?.dueDate ? new Date(nextAssignment.dueDate).getTime() : Number.POSITIVE_INFINITY;
  const classTime = nextClass?.date ? new Date(nextClass.date).getTime() : Number.POSITIVE_INFINITY;
  const continueItem = nextAssignment && assignmentTime <= classTime
    ? { href: `/estudiantes/cursos/${nextAssignment.course}/tps/${nextAssignment.id}`, label: "Trabajo pendiente", title: nextAssignment.title, course: nextAssignment.expand?.course?.title, date: nextAssignment.dueDate, icon: "assignment", action: "Ver trabajo" }
    : nextClass
      ? { href: `/estudiantes/cursos/${nextClass.course}/clases/${nextClass.id}`, label: "Próxima clase", title: nextClass.title, course: nextClass.expand?.course?.title, date: nextClass.date, icon: "play_circle", action: "Abrir clase" }
      : dashboard.courses[0] ? { href: `/estudiantes/cursos/${dashboard.courses[0].id}`, label: "Continuar aprendiendo", title: dashboard.courses[0].title, icon: "school", action: "Abrir curso" } : null;
  const filterHref = (value: string) => `/estudiantes?${new URLSearchParams({ ...(query ? { buscar: query } : {}), estado: value })}#mis-cursos`;

  return <div className="student-page student-dashboard">
    <header className="student-page-heading"><div><h1>Hola, <span>{firstName}</span></h1><p className="student-secondary">Todo lo que necesitás para seguir aprendiendo.</p></div><JoinCourseForm className="student-join-course" /></header>
    <StudentMetrics items={[
      { href: "#mis-cursos", value: dashboard.courses.length, label: dashboard.courses.length === 1 ? "curso" : "cursos", icon: "local_library" },
      { href: "#proximos-trabajos", value: dashboard.pendingAssignmentCount, label: dashboard.pendingAssignmentCount === 1 ? "trabajo pendiente" : "trabajos pendientes", icon: "assignment" },
      { href: "#mis-consultas", value: dashboard.pendingInquiryCount, label: dashboard.pendingInquiryCount === 1 ? "consulta pendiente" : "consultas pendientes", icon: "chat_bubble_outline" },
    ]} />
    <div className={`student-action-grid ${invitations.length ? "has-invitations" : ""}`}>
      {continueItem ? <StudentAction item={continueItem} /> : <EmptyState icon="school" title={invitations.length ? "Activá tu invitación" : "Empezá sumándote a un curso"} description={invitations.length ? "Ingresá la contraseña para incorporar el curso a tu matrícula." : "Usá la clave que te compartió el docente desde Sumarme a un curso."} />}
      <PendingCourseInvitations compact invitations={invitations} />
    </div>
    <div className="student-content-grid">
      <StudentPanel id="mis-cursos" title="Mis cursos" action={<span className="student-secondary" role="status">{filteredCourses.length} {filteredCourses.length === 1 ? "curso encontrado" : "cursos encontrados"}</span>}>
        <form method="get" role="search" className="student-course-search"><label><span className="sr-only">Buscar curso</span><StudentIcon name="search" /><input type="search" name="buscar" placeholder="Buscar curso" defaultValue={query} /></label><label className="student-status-select"><span className="sr-only">Estado</span><select name="estado" defaultValue={status}><option value="all">Todos</option><option value="en curso">En curso</option><option value="finalizado">Finalizados</option></select></label><button type="submit" className="student-button">Buscar</button></form>
        <nav className="student-course-filters" aria-label="Filtrar cursos por estado">{[["all", "Todos"], ["en curso", "En curso"], ["finalizado", "Finalizados"]].map(([value, label]) => <Link key={value} href={filterHref(value)} aria-current={status === value ? "page" : undefined}>{label}</Link>)}</nav>
        {filteredCourses.length ? <div className="student-course-list">{filteredCourses.map(course => {
          const activity = dashboard.nextActivityByCourse[course.id];
          const teachers = course.expand?.teachers?.map(teacher => teacher.name || teacher.username).join(" · ");
          return <Link key={course.id} className="student-course-row" href={`/estudiantes/cursos/${course.id}`}><span className="student-course-icon"><StudentIcon name="menu_book" /></span><div><h3>{course.title}</h3><p className="student-secondary student-course-description-preview">{teachers || studentPlainText(course.description) || "Abrí el curso para explorar el contenido."}</p>{activity ? <p className="student-course-next"><span>{activity.type === "assignment" ? "Próxima entrega" : "Próxima clase"}:</span> {activity.title}{activity.date && <> · <FormattedDate date={activity.date} showTime /></>}</p> : <p className="student-course-next">Sin próximas actividades programadas.</p>}</div><Badge tone={course.status === "en curso" ? "success" : "neutral"}>{course.status === "en curso" ? "En curso" : "Finalizado"}</Badge><StudentIcon name="chevron_right" /></Link>;
        })}</div> : <EmptyState title={dashboard.courses.length ? "No hay coincidencias" : "Todavía no tenés cursos"} description={dashboard.courses.length ? "Probá otro título o estado." : "Activá una invitación pendiente o ingresá la clave de un curso."} action={dashboard.courses.length ? <Link className="student-text-action" href="/estudiantes#mis-cursos">Limpiar filtros</Link> : undefined} />}
      </StudentPanel>
      <aside className="student-support-column" aria-label="Pendientes del estudiante">
        <StudentPanel id="proximos-trabajos" title="Próximas entregas"><div className="student-agenda">{dashboard.pendingAssignments.length ? dashboard.pendingAssignments.map(assignment => <Link key={assignment.id} className="student-agenda-row" href={`/estudiantes/cursos/${assignment.course}/tps/${assignment.id}`}><StudentIcon name="event_note" /><div><h3>{assignment.title}</h3><p className="student-secondary">{assignment.expand?.course?.title}</p><p className="student-secondary">{assignment.dueDate ? <FormattedDate date={assignment.dueDate} showTime /> : "Sin fecha límite"}</p></div><Badge tone={getDeadlineState(assignment.dueDate) === "due-soon" ? "warning" : "neutral"}>{getDeadlineState(assignment.dueDate) === "due-soon" ? "Vence pronto" : "Pendiente"}</Badge></Link>) : <p className="student-empty-text">Estás al día. No tenés trabajos pendientes.</p>}</div>{dashboard.pendingAssignmentCount > dashboard.pendingAssignments.length && <p className="student-secondary">Mostrando las próximas {dashboard.pendingAssignments.length} entregas. Consultá los demás trabajos desde tus cursos.</p>}</StudentPanel>
        <StudentPanel id="mis-consultas" title="Mis consultas"><StudentInquiries inquiries={dashboard.pendingInquiries} /></StudentPanel>
      </aside>
    </div>
  </div>;
}
