import type { ReactNode } from "react";
import type { Course } from "@/types";
import { Badge, Breadcrumbs, PageHeader, Tabs, type TabItem } from "@/components/ui";

export type StudentCourseSection = "resumen" | "clases" | "trabajos" | "contenidos" | "consultas";

const labels: Record<StudentCourseSection, string> = { resumen: "Resumen", clases: "Clases", trabajos: "Trabajos", contenidos: "Contenidos", consultas: "Consultas" };

function items(course: Course, current: StudentCourseSection): TabItem[] {
  const base = `/estudiantes/cursos/${course.id}`;
  const result: TabItem[] = [
    { href: base, label: "Resumen", icon: "dashboard", isActive: current === "resumen" },
    { href: `${base}#clases`, label: "Clases", icon: "menu_book", isActive: current === "clases" },
    { href: `${base}#trabajos`, label: "Trabajos", icon: "assignment", isActive: current === "trabajos" },
  ];
  if (course.contentsEnabled) result.push({ href: `${base}/contenidos`, label: "Contenidos", icon: "library_books", isActive: current === "contenidos" });
  result.push({ href: `${base}/consultas`, label: "Consultas", icon: "forum", isActive: current === "consultas" });
  return result;
}

export function StudentCourseContext({ actions, course, current, description, title }: { actions?: ReactNode; course: Course; current: StudentCourseSection; description?: ReactNode; title?: ReactNode }) {
  return <div className="space-y-6">
    <Breadcrumbs items={[{ href: "/estudiantes", label: "Mis cursos" }, { href: `/estudiantes/cursos/${course.id}`, label: course.title }, { label: labels[current] }]} />
    <PageHeader eyebrow="Curso" title={title ?? course.title} description={description ?? course.description} metadata={<Badge tone={course.status === "en curso" ? "success" : "neutral"}>{course.status}</Badge>} actions={actions} />
    <Tabs label={`Secciones de ${course.title}`} items={items(course, current)} />
  </div>;
}
