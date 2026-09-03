import type { ComponentProps, ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User, UserRole } from "@/types";

let currentPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: ComponentProps<"img">) => <span role="img" aria-label={alt || undefined} />,
}));

vi.mock("@/components/ProfileModalButton", () => ({
  default: ({ children }: { children: ReactNode }) => <button aria-label="Abrir mi perfil">{children}</button>,
}));

vi.mock("@/components/LogoutButton", () => ({
  default: () => <button>Cerrar sesión</button>,
}));

import AppShell from "./AppShell";

const workspaceAccess = {
  admin: { available: ["admin", "estudiante"] as UserRole[], preferred: "admin" as const },
  docente: { available: ["docente", "estudiante"] as UserRole[], preferred: "docente" as const },
  estudiante: { available: ["estudiante"] as UserRole[], preferred: "estudiante" as const },
};

function buildUser(role: UserRole): User {
  return {
    id: `${role}-id`,
    collectionId: "users",
    collectionName: "users",
    created: "2026-01-01T00:00:00Z",
    updated: "2026-01-01T00:00:00Z",
    username: role,
    email: `${role}@example.com`,
    name: role,
    role,
  };
}

describe("AppShell", () => {
  beforeEach(() => {
    currentPathname = "/";
  });

  it("muestra únicamente la navegación administrativa y marca la ruta activa", () => {
    currentPathname = "/admin/users";
    render(<AppShell user={buildUser("admin")} workspaceAccess={workspaceAccess.admin} pocketbaseUrl="https://pb.example.com"><p>Contenido</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "Usuarios" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Clases" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mis cursos" })).not.toBeInTheDocument();
  });

  it("limita la navegación docente a cursos y clases", () => {
    currentPathname = "/docentes/cursos/curso-1";
    render(<AppShell user={buildUser("docente")} workspaceAccess={workspaceAccess.docente} pocketbaseUrl="https://pb.example.com"><p>Contenido</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "Cursos" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getAllByRole("link", { name: "Clases" })).not.toHaveLength(0);
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("limita la navegación estudiante a sus cursos", () => {
    currentPathname = "/estudiantes/cursos/curso-1";
    render(<AppShell user={buildUser("estudiante")} workspaceAccess={workspaceAccess.estudiante} pocketbaseUrl="https://pb.example.com"><p>Contenido</p></AppShell>);

    expect(screen.getAllByRole("link", { name: "Mis cursos" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clases" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Cambiar espacio" })).not.toBeInTheDocument();
  });

  it("permite cambiar entre docencia y estudio sin depender del rol global", () => {
    currentPathname = "/docentes";
    render(<AppShell user={buildUser("estudiante")} workspaceAccess={workspaceAccess.docente} pocketbaseUrl="https://pb.example.com"><p>Contenido</p></AppShell>);

    expect(screen.getAllByRole("navigation", { name: "Cambiar espacio" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^Docencia/ }).find((link) => link.getAttribute("aria-current") === "page")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Estudio" })[0]).toHaveAttribute("href", "/estudiantes");
    expect(screen.getAllByLabelText("Cambiar espacio").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("link", { name: "Saltar al contenido" })).toHaveAttribute("href", "#main-content");
  });
});
