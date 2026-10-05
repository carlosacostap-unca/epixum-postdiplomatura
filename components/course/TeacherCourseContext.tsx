import type { ReactNode } from "react";
import type { Course } from "@/types";
import { Badge, Breadcrumbs, PageHeader, Tabs, type TabItem } from "@/components/ui";
import { courseLearningNavigation } from "@/lib/course-navigation";

export type TeacherCourseSection =
  | "resumen"
  | "onboarding"
  | "clases"
  | "trabajos"
  | "contenidos"
  | "interactivas"
  | "preparacion"
  | "revisiones"
  | "consultas"
  | "estudiantes"
  | "acceso";

const sectionLabels: Record<TeacherCourseSection, string> = {
  resumen: "Resumen",
  onboarding: "Onboarding",
  clases: "Clases",
  trabajos: "Trabajos",
  contenidos: "Contenidos",
  interactivas: "Clases interactivas",
  preparacion: "Preparación",
  revisiones: "Revisiones",
  consultas: "Consultas",
  estudiantes: "Estudiantes",
  acceso: "Acceso",
};

function tabs(course: Course, current: TeacherCourseSection): TabItem[] {
  const base = `/docentes/cursos/${course.id}`;
  const items: TabItem[] = [
    { href: base, label: "Resumen", icon: "dashboard", isActive: current === "resumen" },
    ...courseLearningNavigation(course, base, current),
  ];
  if (course.contentsEnabled) items.push({ href: `${base}/contenidos`, label: "Contenidos", icon: "library_books", isActive: current === "contenidos" });
  if (course.onboardingEnabled) items.push({ href: `${base}/onboarding`, label: "Onboarding", icon: "checklist", isActive: current === "onboarding" });
  if (course.interactiveClassesEnabled) items.push({ href: `${base}/interactivas`, label: "Interactivas", icon: "interactive_space", isActive: current === "interactivas" });
  if (course.preparationEnabled) items.push({ href: `${base}/preparacion`, label: "Preparación", icon: "quiz", isActive: current === "preparacion" });
  if (course.reviewsEnabled) items.push({ href: `${base}/revisiones`, label: "Revisiones", icon: "event_available", isActive: current === "revisiones" });
  items.push(
    { href: `${base}/consultas`, label: "Consultas", icon: "forum", isActive: current === "consultas" },
    { href: `${base}#estudiantes`, label: "Estudiantes", icon: "group", isActive: current === "estudiantes" },
    { href: `${base}#acceso`, label: "Acceso", icon: "key", isActive: current === "acceso" },
  );
  return items;
}

function statusTone(status: Course["status"]) {
  if (status === "en curso") return "success" as const;
  if (status === "borrador") return "warning" as const;
  return "neutral" as const;
}

export function TeacherCourseContext({
  actions,
  course,
  current,
  description,
  title,
}: {
  actions?: ReactNode;
  course: Course;
  current: TeacherCourseSection;
  description?: ReactNode;
  title?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { href: "/docentes", label: "Inicio" },
          { href: `/docentes/cursos/${course.id}`, label: course.title },
          { label: sectionLabels[current] },
        ]}
      />
      <PageHeader
        eyebrow="Curso docente"
        title={title ?? course.title}
        description={description ?? course.description}
        metadata={<Badge tone={statusTone(course.status)}>{course.status}</Badge>}
        actions={actions}
      />
      <Tabs label={`Secciones de ${course.title}`} items={tabs(course, current)} />
    </div>
  );
}
