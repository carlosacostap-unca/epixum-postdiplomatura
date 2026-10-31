import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import CourseAdminNavigation from "./CourseAdminNavigation";

const mocks = vi.hoisted(() => ({ pathname: "/admin/courses/course-1/participants", push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push: mocks.push }) }));

describe("CourseAdminNavigation", () => {
  it("expone destinos enlazables e identifica semánticamente el actual", () => {
    render(<CourseAdminNavigation courseId="course-1" />);
    expect(screen.getByRole("navigation", { name: "Administrar curso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Configuración/ })).toHaveAttribute("href", "/admin/courses/course-1");
    expect(screen.getByRole("link", { name: /Participantes/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Acceso/ })).toHaveAttribute("href", "/admin/courses/course-1/access");
  });

  it("conserva las herramientas habilitadas y reconoce sus páginas de detalle", () => {
    mocks.pathname = "/admin/courses/course-1/parciales/exam-1/resultados";
    render(<CourseAdminNavigation courseId="course-1" courseTitle="Curso de prueba" examsEnabled outcomesEnabled surveysEnabled />);
    expect(screen.getByRole("link", { name: /Parciales/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Resultados de cursada/ })).toHaveAttribute("href", "/admin/courses/course-1/resultados");
    expect(screen.getByRole("link", { name: /Encuestas/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Onboarding/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Simulaciones/ })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sección del curso" })).toHaveValue("/admin/courses/course-1/parciales");
  });

  it("navega desde móvil a los mismos destinos habilitados", async () => {
    const user = userEvent.setup();
    render(<CourseAdminNavigation courseId="course-1" onboardingEnabled />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Sección del curso" }), "/admin/courses/course-1/onboarding");
    expect(mocks.push).toHaveBeenCalledWith("/admin/courses/course-1/onboarding");
  });
});
