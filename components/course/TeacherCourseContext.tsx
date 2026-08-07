import type { ReactNode } from "react";
import type { Course } from "@/types";
import { Badge, Breadcrumbs, PageHeader, Tabs, type TabItem } from "@/components/ui";

export type TeacherCourseSection =
  | "resumen"
  | "clases"
  | "trabajos"
  | "consultas"
  | "estudiantes"
  | "acceso";

const sectionLabels: Record<TeacherCourseSection, string> = {
  resumen: "Resumen",
  clases: "Clases",
  trabajos: "Trabajos",
  consultas: "Consultas",
  estudiantes: "Estudiantes",
  acceso: "Acceso",
};

function tabs(courseId: string, current: TeacherCourseSection): TabItem[] {
  const base = `/docentes/cursos/${courseId}`;
  return [
    { href: base, label: "Resumen", icon: "dashboard", isActive: current === "resumen" },
    { href: `${base}#clases`, label: "Clases", icon: "menu_book", isActive: current === "clases" },
    { href: `${base}#trabajos`, label: "Trabajos", icon: "assignment", isActive: current === "trabajos" },
    { href: `${base}/consultas`, label: "Consultas", icon: "forum", isActive: current === "consultas" },
    { href: `${base}#estudiantes`, label: "Estudiantes", icon: "group", isActive: current === "estudiantes" },
    { href: `${base}#acceso`, label: "Acceso", icon: "key", isActive: current === "acceso" },
  ];
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
      <Tabs label={`Secciones de ${course.title}`} items={tabs(course.id, current)} />
    </div>
  );
}
