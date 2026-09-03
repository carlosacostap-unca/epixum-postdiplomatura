import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CourseAdminNavigation from "./CourseAdminNavigation";

const mocks = vi.hoisted(() => ({ pathname: "/admin/courses/course-1/participants" }));
vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname }));

describe("CourseAdminNavigation", () => {
  it("expone destinos enlazables e identifica semánticamente el actual", () => {
    render(<CourseAdminNavigation courseId="course-1" />);
    expect(screen.getByRole("navigation", { name: "Administrar curso" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Configuración/ })).toHaveAttribute("href", "/admin/courses/course-1");
    expect(screen.getByRole("link", { name: /Participantes/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Acceso/ })).toHaveAttribute("href", "/admin/courses/course-1/access");
  });
});
