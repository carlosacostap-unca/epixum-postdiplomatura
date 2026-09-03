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
  it("muestra contenidos deshabilitados por defecto y explica que conserva los datos", () => {
    render(<ToastProvider><CourseForm availableClasses={[]} availableAssignments={[]} availableInquiries={[]} /></ToastProvider>);
    expect(screen.getByRole("checkbox", { name: /habilitar contenidos/i })).not.toBeChecked();
    expect(screen.getByText(/contenidos y sus recursos se conservan ocultos/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /habilitar preevaluación asistida por ia/i })).not.toBeChecked();
  });

  it("refleja la habilitación administrativa de IA guardada", () => {
    render(<ToastProvider><CourseForm course={{ ...course, aiPreevaluationEnabled: true }} availableClasses={[]} availableAssignments={[]} availableInquiries={[]} /></ToastProvider>);
    expect(screen.getByRole("checkbox", { name: /habilitar preevaluación asistida por ia/i })).toBeChecked();
  });

  it("refleja la configuración guardada del curso", () => {
    render(<ToastProvider><CourseForm course={{ ...course, contentsEnabled: true }} availableClasses={[]} availableAssignments={[]} availableInquiries={[]} /></ToastProvider>);
    expect(screen.getByRole("checkbox", { name: /habilitar contenidos/i })).toBeChecked();
  });

  it("separa docentes y acceso de la configuración general", () => {
    render(<ToastProvider><CourseForm availableClasses={[]} availableAssignments={[]} availableInquiries={[]} /></ToastProvider>);
    expect(screen.queryByLabelText("Docentes Asignados")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Modalidad de matrícula")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Clave de matriculación")).not.toBeInTheDocument();
  });

  it("envía la actualización al presionar el botón", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCourse).mockResolvedValue({ success: true, courseId: course.id });

    render(<ToastProvider><CourseForm course={course} availableClasses={[]} availableAssignments={[]} availableInquiries={[]} /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "Actualizar curso" }));

    expect(updateCourse).toHaveBeenCalledWith("course-1", expect.any(FormData));
    expect(mocks.push).toHaveBeenCalledWith("/admin/courses/course-1");
  });

  it("muestra el error junto al botón cuando la actualización falla", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCourse).mockResolvedValue({ success: false, error: "No tienes permisos para administrar cursos" });
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });

    render(<ToastProvider><CourseForm course={course} availableClasses={[]} availableAssignments={[]} availableInquiries={[]} /></ToastProvider>);
    await user.click(screen.getByRole("button", { name: "Actualizar curso" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No tienes permisos para administrar cursos");
    expect(screen.getByRole("button", { name: "Actualizar curso" })).toBeEnabled();
  });
});
