import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import CourseForm from "./CourseForm";
import type { Course } from "@/types";
import { updateCourse } from "@/lib/actions-courses";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/actions-courses", () => ({ createCourse: vi.fn(), updateCourse: vi.fn() }));
vi.mock("@/components/RichTextEditor", () => ({ default: () => <div data-testid="editor" /> }));

const course: Course = {
  id: "course-1",
  collectionId: "courses",
  collectionName: "courses",
  created: "2026-08-09 00:00:00.000Z",
  updated: "2026-08-09 00:00:00.000Z",
  title: "Curso existente",
  description: "Descripción",
  status: "en curso",
  organizationMode: "tradicional",
  enrollmentMode: "clave",
  teachers: [],
  classes: [],
  assignments: [],
  inquiries: [],
};

describe("CourseForm", () => {
  it("muestra la modalidad por clave por defecto y permite elegir doble validación", async () => {
    const user = userEvent.setup();
    render(<ToastProvider><CourseForm teachers={[]} availableClasses={[]} availableAssignments={[]} availableInquiries={[]} /></ToastProvider>);
    const mode = screen.getByRole("combobox", { name: "Modalidad de matrícula" });
    expect(mode).toHaveValue("clave");
    expect(screen.getByLabelText("Clave de matriculación")).toBeInTheDocument();
    await user.selectOptions(mode, "invitacion_contrasena");
    expect(screen.getByLabelText("Contraseña compartida del curso")).toHaveAttribute("type", "password");
    expect(screen.getByText(/no elimina matrículas ni invitaciones/i)).toBeInTheDocument();
    expect(screen.getByText(/comunicación se realiza fuera de Epixum/i)).toBeInTheDocument();
  });

  it("envía la actualización al presionar el botón", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCourse).mockResolvedValue(course);

    render(<ToastProvider><CourseForm course={course} teachers={[]} availableClasses={[]} availableAssignments={[]} availableInquiries={[]} /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "Actualizar curso" }));

    expect(updateCourse).toHaveBeenCalledWith("course-1", expect.any(FormData));
    expect(mocks.push).toHaveBeenCalledWith("/admin/courses");
  });

  it("muestra el error junto al botón cuando la actualización falla", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCourse).mockRejectedValue(new Error("No tienes permisos para administrar cursos"));
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });

    render(<ToastProvider><CourseForm course={course} teachers={[]} availableClasses={[]} availableAssignments={[]} availableInquiries={[]} /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "Actualizar curso" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes permisos para administrar cursos");
    expect(screen.getByRole("button", { name: "Actualizar curso" })).toBeEnabled();
  });
});
