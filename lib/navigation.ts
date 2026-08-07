import type { UserRole } from "@/types";

export interface AppNavigationItem {
  href: string;
  icon: string;
  label: string;
  matchPrefixes?: string[];
}

export interface RoleNavigationConfig {
  homeHref: string;
  items: AppNavigationItem[];
  workspaceLabel: string;
}

export const roleNavigation: Record<UserRole, RoleNavigationConfig> = {
  admin: {
    homeHref: "/admin",
    workspaceLabel: "Administración",
    items: [
      { href: "/admin/courses", label: "Cursos", icon: "school" },
      { href: "/admin/users", label: "Usuarios", icon: "group" },
    ],
  },
  docente: {
    homeHref: "/docentes",
    workspaceLabel: "Docencia",
    items: [
      {
        href: "/docentes",
        label: "Cursos",
        icon: "local_library",
        matchPrefixes: ["/docentes/cursos"],
      },
      { href: "/docentes/clases", label: "Clases", icon: "menu_book" },
    ],
  },
  estudiante: {
    homeHref: "/estudiantes",
    workspaceLabel: "Estudio",
    items: [
      {
        href: "/estudiantes",
        label: "Mis cursos",
        icon: "local_library",
        matchPrefixes: ["/estudiantes/cursos"],
      },
    ],
  },
};

export function getHomeForRole(role: UserRole) {
  return roleNavigation[role].homeHref;
}

export function isNavigationItemActive(pathname: string, item: AppNavigationItem) {
  if (pathname === item.href) return true;
  if (item.matchPrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return true;
  return item.href !== "/docentes" && item.href !== "/estudiantes" && pathname.startsWith(`${item.href}/`);
}
