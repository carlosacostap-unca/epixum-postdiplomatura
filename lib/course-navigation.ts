import type { Course } from "@/types";

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
