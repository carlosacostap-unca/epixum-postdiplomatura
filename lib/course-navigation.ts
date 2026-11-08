import type { Course } from "@/types";
import { getCourseGame } from "@/lib/course-game/catalog";

export interface StudentCourseNavigationItem { href: string; label: string; icon: string; isActive?: boolean }

export function studentCourseNavigation(course: Course, current = "resumen"): StudentCourseNavigationItem[] {
  const base = `/estudiantes/cursos/${course.id}`;
  const overview = getCourseGame(course) ? `${base}?vista=clasica` : base;
  return [
    { href: overview, label: "Resumen", icon: "dashboard", isActive: current === "resumen" },
    ...(getCourseGame(course) ? [{ href: `${base}/aventura`, label: "Aventura", icon: "explore", isActive: current === "aventura" }] : []),
    ...courseLearningNavigation(course, overview, current),
    ...(course.contentsEnabled ? [{ href: `${base}/contenidos`, label: "Contenidos", icon: "library_books", isActive: current === "contenidos" }] : []),
    ...(course.examsEnabled ? [{ href: `${base}/parciales`, label: "Parciales", icon: "assignment", isActive: current === "parciales" }] : []),
    ...(course.preparationEnabled ? [{ href: `${base}/preparacion`, label: "Preparación", icon: "quiz", isActive: current === "preparacion" }] : []),
    ...(course.reviewsEnabled ? [{ href: `${base}/revisiones`, label: "Revisiones", icon: "event_available", isActive: current === "revisiones" }] : []),
    ...(course.surveysEnabled ? [{ href: `${base}/encuestas`, label: "Encuestas", icon: "poll", isActive: current === "encuestas" }] : []),
    { href: `${base}/consultas`, label: "Consultas", icon: "forum", isActive: current === "consultas" },
  ];
}

/** Match the destinations rendered by each course organization mode. */
export function courseLearningNavigation(course: Pick<Course, "organizationMode">, base: string, current: string) {
  if (course.organizationMode === "semanal") {
    return [{ href: `${base}#semanas`, label: "Unidades", icon: "view_agenda", isActive: current === "clases" || current === "trabajos" }];
  }
  return [
    { href: `${base}#clases`, label: "Clases", icon: "menu_book", isActive: current === "clases" },
    { href: `${base}#trabajos`, label: "Trabajos", icon: "assignment", isActive: current === "trabajos" },
  ];
}
