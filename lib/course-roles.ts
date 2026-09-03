import type { Course, User, UserRole } from "@/types";

export type AppWorkspace = UserRole;

export interface WorkspaceAccess {
  available: AppWorkspace[];
  preferred: AppWorkspace;
}

export type CourseParticipation = "admin" | "docente" | "estudiante" | "none" | "conflict";

export function isAdmin(user: { role?: string } | null | undefined) {
  return user?.role === "admin";
}

export function isAssignedTeacher(course: Pick<Course, "teachers">, userId: string) {
  return Boolean(course.teachers?.includes(userId));
}

export function getCourseRoleLabel(course: Pick<Course, "teachers">, user: Pick<User, "id" | "role"> | null | undefined) {
  if (!user) return "Estudiante";
  if (isAdmin(user)) return "Administrador";
  return isAssignedTeacher(course, user.id) ? "Docente" : "Estudiante";
}

export function resolveCourseParticipation(
  course: Pick<Course, "teachers">,
  user: Pick<User, "id" | "role">,
  enrolled: boolean,
): CourseParticipation {
  if (isAdmin(user)) return "admin";
  const teaches = isAssignedTeacher(course, user.id);
  if (teaches && enrolled) return "conflict";
  if (teaches) return "docente";
  if (enrolled) return "estudiante";
  return "none";
}

export function resolveWorkspaceAccess(
  user: Pick<User, "role">,
  hasTeachingCourses: boolean,
): WorkspaceAccess {
  const available: AppWorkspace[] = [];
  if (isAdmin(user)) available.push("admin");
  if (hasTeachingCourses) available.push("docente");
  available.push("estudiante");

  const preferred = isAdmin(user)
    ? "admin"
    : user.role === "docente" && hasTeachingCourses
      ? "docente"
      : "estudiante";
  return { available, preferred };
}

export function workspaceFromPath(pathname: string): AppWorkspace {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/docentes" || pathname.startsWith("/docentes/")) return "docente";
  return "estudiante";
}
