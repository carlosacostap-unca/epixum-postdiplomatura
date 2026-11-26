import type { Course, User, UserRole } from "@/types";

export type AppWorkspace = UserRole | "bedel" | "docente_visitante";

export interface WorkspaceAccess {
  available: AppWorkspace[];
  preferred: AppWorkspace;
}

export type CourseParticipation = "admin" | "docente" | "estudiante" | "none" | "conflict";

export function isAdmin(user: { role?: string } | null | undefined) {
  return user?.role === "admin";
}

export function canViewCourseDraft(course: Pick<Course, 'status' | 'teachers' | 'guestStudents'>, user: {id:string;role?:string}) {
  return course.status !== 'borrador' || isAdmin(user) || isAssignedTeacher(course,user.id) || Boolean(course.guestStudents?.includes(user.id));
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
  hasBedelCourses = false,
  hasVisitingCourses = false,
): WorkspaceAccess {
  const available: AppWorkspace[] = [];
  if (isAdmin(user)) available.push("admin");
  if (hasTeachingCourses) available.push("docente");
  if (hasBedelCourses) available.push("bedel");
  if (hasVisitingCourses) available.push("docente_visitante");
  available.push("estudiante");

  const preferred = isAdmin(user)
    ? "admin"
    : user.role === "docente" && hasTeachingCourses
      ? "docente"
      : hasVisitingCourses ? "docente_visitante" : hasBedelCourses ? "bedel" : "estudiante";
  return { available, preferred };
}

export function workspaceFromPath(pathname: string): AppWorkspace {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/docentes" || pathname.startsWith("/docentes/")) return "docente";
  if (pathname === "/bedeles" || pathname.startsWith("/bedeles/")) return "bedel";
  if (pathname === "/visitantes" || pathname.startsWith("/visitantes/")) return "docente_visitante";
  return "estudiante";
}
