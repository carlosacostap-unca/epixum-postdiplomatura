import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import CourseParticipantManager from "./CourseParticipantManager";
import type { CourseParticipantPage } from "@/types";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  search: vi.fn(),
  addStudents: vi.fn(),
  addTeachers: vi.fn(),
  removeStudent: vi.fn(),
  removeTeacher: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/actions-course-participants", () => ({
  searchCourseParticipantCandidates: mocks.search,
  addCourseStudents: mocks.addStudents,
  addCourseTeachers: mocks.addTeachers,
  removeCourseStudent: mocks.removeStudent,
  removeCourseTeacher: mocks.removeTeacher,
}));

const page: CourseParticipantPage = {
  page: 1,
  perPage: 20,
  totalItems: 1,
  totalPages: 1,
  items: [{ id: "enrollment-1", enrollmentId: "enrollment-1", userId: "student-1", name: "Ana Alumna", email: "ana@example.com", username: "ana", globalRole: "docente" }],
};

function renderManager() {
  return render(<ToastProvider><CourseParticipantManager courseId="course-1" courseTitle="Curso Uno" page={page} query="" target="students" /></ToastProvider>);
}

describe("CourseParticipantManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search.mockResolvedValue({ page: 1, perPage: 20, totalItems: 2, totalPages: 1, items: [
      { id: "candidate-1", userId: "candidate-1", name: "Ada Disponible", email: "ada@example.com", username: "ada", globalRole: "admin", state: "available" },
      { id: "teacher-1", userId: "teacher-1", name: "Toni Docente", email: "toni@example.com", username: "toni", globalRole: "estudiante", state: "incompatible", reason: "Primero retiralo como docente de este curso." },
    ] });
    mocks.addStudents.mockResolvedValue({ status: "success", message: "Alumno agregado", affectedIds: ["candidate-1"] });
    mocks.removeStudent.mockResolvedValue({ status: "success", message: "Historial conservado", affectedIds: ["student-1"] });
  });

  it("presenta miembros, búsqueda y acciones con nombres accesibles", () => {
    renderManager();
    expect(screen.getByRole("heading", { name: "alumnos del curso" })).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getAllByText("Ana Alumna").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Agregar alumnos" })).toBeInTheDocument();
  });

  it("busca, explica incompatibilidades, agrega y devuelve el foco", async () => {
    const user = userEvent.setup();
    renderManager();
    const trigger = screen.getByRole("button", { name: "Agregar alumnos" });
    await user.click(trigger);
    const input = screen.getByRole("searchbox", { name: "Buscar por nombre o correo" });
    expect(input).toHaveFocus();
    await user.type(input, "ad");
    const available = await screen.findByRole("checkbox", { name: /Ada Disponible/ });
    expect(screen.getByRole("checkbox", { name: /Toni Docente/ })).toBeDisabled();
    expect(screen.getByText(/Primero retiralo como docente/)).toBeInTheDocument();
    await user.click(available);
    await user.click(screen.getByRole("button", { name: "Agregar 1 alumnos" }));
    expect(mocks.addStudents).toHaveBeenCalledWith("course-1", ["candidate-1"]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("conserva diálogo y selección ante un conflicto recuperable", async () => {
    const user = userEvent.setup();
    mocks.addStudents.mockResolvedValue({ status: "conflict", message: "Ahora es docente" });
    renderManager();
    await user.click(screen.getByRole("button", { name: "Agregar alumnos" }));
    await user.type(screen.getByRole("searchbox", { name: "Buscar por nombre o correo" }), "ad");
    const candidate = await screen.findByRole("checkbox", { name: /Ada Disponible/ });
    await user.click(candidate);
    await user.click(screen.getByRole("button", { name: "Agregar 1 alumnos" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(candidate).toBeChecked();
    expect(await screen.findByText("Ahora es docente")).toBeInTheDocument();
  });

  it("confirma el impacto y retira solamente la matrícula indicada", async () => {
    const user = userEvent.setup();
    renderManager();
    await user.click(screen.getAllByRole("button", { name: "Retirar" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Retirar alumno" });
    expect(dialog).toHaveTextContent("Sus entregas, consultas y evaluaciones se conservarán");
    await user.click(within(dialog).getByRole("button", { name: "Retirar participación" }));
    expect(mocks.removeStudent).toHaveBeenCalledWith("course-1", "enrollment-1");
  });
});
