import type { ReactNode } from "react";
import type { Course } from "@/types";
import { Badge, Breadcrumbs, PageHeader, Tabs, type TabItem } from "@/components/ui";
import { courseLearningNavigation } from "@/lib/course-navigation";

export type StudentCourseSection = "resumen" | "clases" | "trabajos" | "contenidos" | "consultas" | "preparacion" | "parciales" | "revisiones" | "encuestas";

const labels: Record<StudentCourseSection, string> = { resumen: "Resumen", clases: "Clases", trabajos: "Trabajos", contenidos: "Contenidos", consultas: "Consultas", preparacion: "Preparación", parciales: "Parciales", revisiones: "Revisiones", encuestas: "Encuestas" };

function items(course: Course, current: StudentCourseSection): TabItem[] {
  const base = `/estudiantes/cursos/${course.id}`;
  const result: TabItem[] = [
    { href: base, label: "Resumen", icon: "dashboard", isActive: current === "resumen" },
    ...courseLearningNavigation(course, base, current),
  ];
  if (course.contentsEnabled) result.push({ href: `${base}/contenidos`, label: "Contenidos", icon: "library_books", isActive: current === "contenidos" });
  if (course.surveysEnabled) result.push({ href: `${base}/encuestas`, label: "Encuestas", icon: "poll", isActive: current === "encuestas" });
  if (course.examsEnabled) result.push({ href: `${base}/parciales`, label: "Parciales", icon: "assignment", isActive: current === "parciales" });
  if (course.preparationEnabled) result.push({ href: `${base}/preparacion`, label: "Preparación", icon: "quiz", isActive: current === "preparacion" });
  if (course.reviewsEnabled) result.push({ href: `${base}/revisiones`, label: "Revisiones", icon: "event_available", isActive: current === "revisiones" });
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
