import type { ReactNode } from "react";
import type { Course } from "@/types";
import { Badge, Breadcrumbs, PageHeader, Tabs } from "@/components/ui";
import { studentCourseNavigation } from "@/lib/course-navigation";
import FormattedDate from "@/components/FormattedDate";

export type StudentCourseSection = "resumen" | "clases" | "trabajos" | "contenidos" | "consultas" | "preparacion" | "parciales" | "revisiones" | "encuestas";

const labels: Record<StudentCourseSection, string> = { resumen: "Resumen", clases: "Clases", trabajos: "Trabajos", contenidos: "Contenidos", consultas: "Consultas", preparacion: "Preparación", parciales: "Parciales", revisiones: "Revisiones", encuestas: "Encuestas" };

export function StudentCourseContext({ actions, compact = false, course, current, description, title }: { actions?: ReactNode; compact?: boolean; course: Course; current: StudentCourseSection; description?: ReactNode; title?: ReactNode }) {
  if (compact) return <header className="student-course-header">
    <Breadcrumbs items={[{ href: "/estudiantes", label: "Mis cursos" }, { label: course.title }]} />
    <div className="student-course-title"><h1>{title ?? course.title}</h1><Badge tone={course.status === "en curso" ? "success" : "neutral"}>{course.status}</Badge></div>
    <p className="student-secondary">{course.expand?.teachers?.map(teacher => teacher.name || teacher.username).join(" · ") || "Equipo docente"}{course.startDate && <> · <FormattedDate date={course.startDate} /></>}{course.endDate && <> — <FormattedDate date={course.endDate} /></>}</p>
    {description && <details className="student-course-description"><summary>Acerca del curso</summary><div>{description}</div></details>}
    {actions}
  </header>;
  return <div className="space-y-6">
    <Breadcrumbs items={[{ href: "/estudiantes", label: "Mis cursos" }, { href: `/estudiantes/cursos/${course.id}`, label: course.title }, { label: labels[current] }]} />
    <PageHeader eyebrow="Curso" title={title ?? course.title} description={description ?? course.description} metadata={<Badge tone={course.status === "en curso" ? "success" : "neutral"}>{course.status}</Badge>} actions={actions} />
    <Tabs label={`Secciones de ${course.title}`} items={studentCourseNavigation(course, current)} />
  </div>;
}
