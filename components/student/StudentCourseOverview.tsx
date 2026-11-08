import Link from "next/link";
import type { ReactNode } from "react";
import FormattedDate from "@/components/FormattedDate";
import { StudentCourseContext } from "@/components/course/StudentCourseContext";
import { Badge, EmptyState } from "@/components/ui";
import { studentCourseNavigation } from "@/lib/course-navigation";
import { getDeadlineState } from "@/lib/student-learning";
import { studentDeliveryPresentation } from "@/lib/delivery-presentation";
import type { Assignment, Class, Course, CourseWeek, Delivery, Inquiry } from "@/types";
import StudentCourseNavigation from "./StudentCourseNavigation";
import { StudentAction, StudentIcon, StudentInquiries, StudentMetrics, StudentPanel, studentPlainText, type StudentNextAction } from "./StudentLearningUI";

export function StudentClassRow({ courseId, item, nextClass, now }: { courseId: string; item: Class; nextClass?: string; now: Date }) {
  const future = Boolean(item.date && new Date(item.date) >= now);
  return <Link href={`/estudiantes/cursos/${courseId}/clases/${item.id}`} className="student-resource-row"><StudentIcon name="play_circle" /><div><h4>{item.title}</h4><p className="student-secondary">Clase · {item.date ? <FormattedDate date={item.date} showTime /> : "Sin fecha"}</p></div><Badge tone={item.id === nextClass ? "success" : "neutral"}>{item.id === nextClass ? "Próxima" : future ? "Programada" : "Disponible"}</Badge><StudentIcon name="chevron_right" /></Link>;
}

export function StudentAssignmentRow({ courseId, assignment, delivery, now }: { courseId: string; assignment: Assignment; delivery?: Delivery | null; now: Date }) {
  const deadline = getDeadlineState(assignment.dueDate, now);
  const badge = delivery ? studentDeliveryPresentation(delivery)
    : deadline === "overdue" ? assignment.allowLateSubmissions ? { tone: "warning" as const, label: "Admite entrega fuera de término" } : { tone: "error" as const, label: "Vencido sin entrega" }
      : deadline === "due-soon" ? { tone: "warning" as const, label: "Vence en menos de 72 h" } : { tone: "neutral" as const, label: "Pendiente" };
  return <Link href={`/estudiantes/cursos/${courseId}/tps/${assignment.id}`} className="student-resource-row"><StudentIcon name="description" /><div><h4>{assignment.title}</h4><p className="student-secondary">{assignment.dueDate ? <>Entrega: <FormattedDate date={assignment.dueDate} showTime /></> : "Sin fecha límite"}</p></div><Badge tone={badge.tone}>{badge.label}</Badge><StudentIcon name="chevron_right" /></Link>;
}

export interface StudentCourseGroup { week: CourseWeek; classes: Class[]; assignments: Assignment[]; inquiries: Inquiry[] }

interface StudentCourseOverviewProps {
  course: Course;
  classes: Class[];
  assignments: Assignment[];
  pendingAssignments: Assignment[];
  pendingInquiries: Inquiry[];
  deliveryByAssignment: Map<string, Delivery | null>;
  visibleGroups: StudentCourseGroup[];
  activeGroupId?: string;
  nextClass?: Class;
  nextAction: StudentNextAction | null;
  now: Date;
  onboarding?: ReactNode;
  outcome?: ReactNode;
}

export default function StudentCourseOverview({ course, classes, assignments, pendingAssignments, pendingInquiries, deliveryByAssignment, visibleGroups, activeGroupId, nextClass, nextAction, now, onboarding, outcome }: StudentCourseOverviewProps) {
  const weekly = course.organizationMode === "semanal";
  const base = `/estudiantes/cursos/${course.id}`;
  const showNextClass = nextClass && nextAction?.icon === "assignment";
  return <div className="student-course-layout">
    <StudentCourseNavigation key={course.id} courseTitle={course.title} items={studentCourseNavigation(course)} />
    <div className="student-page student-course-overview">
      <div className="student-course-heading-row"><StudentCourseContext compact course={course} current="resumen" description={studentPlainText(course.description)} />{onboarding}</div>
      <StudentMetrics items={[
        { href: weekly ? "#semanas" : "#clases", value: classes.length, label: classes.length === 1 ? "clase" : "clases", icon: "menu_book" },
        { href: weekly ? "#semanas" : "#trabajos", value: pendingAssignments.length, label: pendingAssignments.length === 1 ? "trabajo pendiente" : "trabajos pendientes", icon: "assignment" },
        { href: `${base}/consultas?autor=mis-consultas&estado=Pendiente`, value: pendingInquiries.length, label: pendingInquiries.length === 1 ? "consulta pendiente" : "consultas pendientes", icon: "chat_bubble_outline" },
      ]} />
      <div className={`student-action-grid ${showNextClass ? "has-secondary" : ""}`}>
        {nextAction ? <StudentAction item={nextAction} /> : <section className="student-next-action"><div><p className="student-eyebrow">Seguí aprendiendo</p><h2>Explorá el contenido del curso</h2><p className="student-secondary">No hay próximas actividades programadas.</p></div><a className="student-button" href={weekly ? "#semanas" : "#clases"}>Ver contenido<StudentIcon name="arrow_downward" /></a></section>}
        {showNextClass && <section className="student-next-class" aria-label="Próxima clase"><p className="student-eyebrow">Próxima clase</p><h2>{nextClass.title}</h2><p className="student-secondary">{nextClass.date && <FormattedDate date={nextClass.date} showTime />}</p><Link href={`${base}/clases/${nextClass.id}`} className="student-text-action">Abrir clase <StudentIcon name="arrow_forward" /></Link></section>}
      </div>
      <div className="student-content-grid">
        {weekly ? <StudentPanel id="semanas" title="Unidades del curso" action={<span className="student-secondary">{visibleGroups.length} publicadas</span>}>
          {visibleGroups.length ? <div className="student-units">{visibleGroups.map(group => <details key={group.week.id} id={`unit-${group.week.id}`} className="student-unit" open={group.week.id === activeGroupId}>
            <summary><span className="student-unit-number">{String(group.week.number).padStart(2, "0")}</span><div><h3>{group.week.title}</h3><p className="student-secondary">{group.classes.length} clases · {group.assignments.length} trabajos · {group.inquiries.length} consultas</p>{(group.week.startDate || group.week.endDate) && <p className="student-secondary">{group.week.startDate && <FormattedDate date={group.week.startDate} />}{group.week.endDate && <> — <FormattedDate date={group.week.endDate} /></>}</p>}</div><StudentIcon name="expand_more" /></summary>
            <div className="student-unit-content">{group.classes.map(item => <StudentClassRow key={item.id} courseId={course.id} item={item} nextClass={nextClass?.id} now={now} />)}{group.assignments.map(assignment => <StudentAssignmentRow key={assignment.id} courseId={course.id} assignment={assignment} delivery={deliveryByAssignment.get(assignment.id)} now={now} />)}{!group.classes.length && !group.assignments.length && !group.inquiries.length && <p className="student-empty-text">Esta unidad todavía no tiene contenido.</p>}
              <div className="student-unit-actions"><Link className="student-text-action" href={`${base}/consultas/nueva?semana=${group.week.id}`}><StudentIcon name="chat_bubble_outline" />Hacer una consulta</Link>{group.inquiries.length > 0 && <Link className="student-text-action" href={`${base}/consultas?semana=${group.week.id}`}>Ver {group.inquiries.length} {group.inquiries.length === 1 ? "consulta" : "consultas"}<StudentIcon name="arrow_forward" /></Link>}</div>
            </div>
          </details>)}</div> : <EmptyState icon="view_agenda" title="Todavía no hay unidades publicadas" description="El contenido aparecerá cuando el docente publique la primera unidad." />}
        </StudentPanel> : <div className="student-traditional-content">
          <StudentPanel id="clases" title="Clases y materiales">{classes.length ? classes.map(item => <StudentClassRow key={item.id} courseId={course.id} item={item} nextClass={nextClass?.id} now={now} />) : <p className="student-empty-text">Todavía no hay clases publicadas.</p>}</StudentPanel>
          <StudentPanel id="trabajos" title="Trabajos prácticos">{assignments.length ? assignments.map(assignment => <StudentAssignmentRow key={assignment.id} courseId={course.id} assignment={assignment} delivery={deliveryByAssignment.get(assignment.id)} now={now} />) : <p className="student-empty-text">Todavía no hay trabajos disponibles.</p>}</StudentPanel>
        </div>}
        <aside className="student-support-column" aria-label="Acompañamiento del curso">
          {course.preparationEnabled && <StudentPanel title="Preparación"><p className="student-secondary">Practicá antes del parcial con las simulaciones del curso.</p><Link className="student-tool-link" href={`${base}/preparacion`}><StudentIcon name="quiz" /><span>Ver simulaciones<span className="student-secondary">Prácticas y resultados orientativos</span></span><StudentIcon name="arrow_forward" /></Link></StudentPanel>}
          <StudentPanel title="Mis consultas" action={<Link href={`${base}/consultas/nueva`} className="student-text-action">Nueva consulta</Link>}><StudentInquiries inquiries={pendingInquiries.slice(0, 3)} /><Link className="student-text-action" href={`${base}/consultas?autor=mis-consultas&estado=Pendiente`}>Ver mis consultas <StudentIcon name="arrow_forward" /></Link></StudentPanel>
          {outcome}
        </aside>
      </div>
    </div>
  </div>;
}
