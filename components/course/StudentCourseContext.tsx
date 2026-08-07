import type { ReactNode } from "react";
import type { Course } from "@/types";
import { Badge, Breadcrumbs, PageHeader, Tabs, type TabItem } from "@/components/ui";

export type StudentCourseSection = "resumen" | "clases" | "trabajos" | "consultas";

const labels: Record<StudentCourseSection, string> = { resumen: "Resumen", clases: "Clases", trabajos: "Trabajos", consultas: "Consultas" };

function items(courseId: string, current: StudentCourseSection): TabItem[] {
  const base = `/estudiantes/cursos/${courseId}`;
  return [
    { href: base, label: "Resumen", icon: "dashboard", isActive: current === "resumen" },
    { href: `${base}#clases`, label: "Clases", icon: "menu_book", isActive: current === "clases" },
    { href: `${base}#trabajos`, label: "Trabajos", icon: "assignment", isActive: current === "trabajos" },
    { href: `${base}/consultas`, label: "Consultas", icon: "forum", isActive: current === "consultas" },
  ];
}

export function StudentCourseContext({ actions, course, current, description, title }: { actions?: ReactNode; course: Course; current: StudentCourseSection; description?: ReactNode; title?: ReactNode }) {
  return <div className="space-y-6">
    <Breadcrumbs items={[{ href: "/estudiantes", label: "Mis cursos" }, { href: `/estudiantes/cursos/${course.id}`, label: course.title }, { label: labels[current] }]} />
    <PageHeader eyebrow="Curso" title={title ?? course.title} description={description ?? course.description} metadata={<Badge tone={course.status === "en curso" ? "success" : "neutral"}>{course.status}</Badge>} actions={actions} />
    <Tabs label={`Secciones de ${course.title}`} items={items(course.id, current)} />
  </div>;
}
