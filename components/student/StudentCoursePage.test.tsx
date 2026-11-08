import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Class, Course, CourseWeek } from "@/types";
import CoursePage from "@/app/estudiantes/cursos/[id]/page";

const mocks = vi.hoisted(() => ({ user: vi.fn(), course: vi.fn(), enrolled: vi.fn(), organization: vi.fn(), classes: vi.fn(), assignments: vi.fn(), inquiries: vi.fn(), delivery: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); }, useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/pocketbase-server", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/data", () => ({ getCourse: mocks.course, isStudentEnrolled: mocks.enrolled, getCourseOrganizationData: mocks.organization, getClassesByCourse: mocks.classes, getAssignmentsByCourse: mocks.assignments, getUserDelivery: mocks.delivery }));
vi.mock("@/lib/actions-inquiries", () => ({ getInquiries: mocks.inquiries }));
const base = { collectionId: "test", collectionName: "test", created: "", updated: "" };
const course: Course = { ...base, id: "course-1", title: "Curso de prueba", description: "Descripción", status: "en curso", organizationMode: "semanal" };
const week: CourseWeek = { ...base, id: "week-1", course: course.id, number: 1, title: "Unidad publicada", status: "publicada" };
const lesson: Class = { ...base, id: "class-1", course: course.id, week: week.id, title: "Clase visible", description: "", date: "2026-11-10T18:00:00Z" };

describe("resumen estudiantil del curso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.mockResolvedValue({ id: "student-1", name: "Ana" });
    mocks.course.mockResolvedValue(course);
    mocks.enrolled.mockResolvedValue(true);
    mocks.classes.mockResolvedValue([lesson]);
    mocks.assignments.mockResolvedValue([]);
    mocks.inquiries.mockResolvedValue([]);
    mocks.delivery.mockResolvedValue(null);
  });

  it("rechaza el acceso sin matrícula antes de cargar actividades", async () => {
    mocks.enrolled.mockResolvedValue(false);
    await expect(CoursePage({ params: Promise.resolve({ id: course.id }) })).rejects.toThrow("redirect:/estudiantes");
    expect(mocks.organization).not.toHaveBeenCalled();
    expect(mocks.assignments).not.toHaveBeenCalled();
  });

  it("rechaza una sesión ausente antes de consultar el curso", async () => {
    mocks.user.mockResolvedValue(null);
    await expect(CoursePage({ params: Promise.resolve({ id: course.id }) })).rejects.toThrow("redirect:/login");
    expect(mocks.course).not.toHaveBeenCalled();
  });

  it("conserva las unidades publicadas y excluye borradores y su contenido", async () => {
    mocks.organization.mockResolvedValue({ classes: [lesson], assignments: [], inquiries: [], groups: [
      { week, classes: [lesson], assignments: [], inquiries: [] },
      { week: { ...week, id: "hidden", title: "Unidad secreta", status: "borrador" }, classes: [{ ...lesson, id: "hidden-class", title: "Clase secreta" }], assignments: [], inquiries: [] },
    ] });
    render(await CoursePage({ params: Promise.resolve({ id: course.id }) }));
    expect(screen.getByRole("heading", { name: "Unidad publicada" })).toBeInTheDocument();
    expect(screen.queryByText("Unidad secreta")).not.toBeInTheDocument();
    expect(screen.queryByText("Clase secreta")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Clase visible/ })).toHaveAttribute("href", "/estudiantes/cursos/course-1/clases/class-1");
    expect(screen.getByRole("link", { name: /Hacer una consulta/ })).toHaveAttribute("href", "/estudiantes/cursos/course-1/consultas/nueva?semana=week-1");
  });

  it("conserva las secciones y destinos de un curso tradicional", async () => {
    mocks.course.mockResolvedValue({ ...course, organizationMode: "tradicional" });
    render(await CoursePage({ params: Promise.resolve({ id: course.id }) }));
    expect(screen.getByRole("region", { name: "Clases y materiales" })).toHaveAttribute("id", "clases");
    expect(screen.getByRole("region", { name: "Trabajos prácticos" })).toHaveAttribute("id", "trabajos");
    expect(screen.getByRole("link", { name: "Clases" })).toHaveAttribute("href", "/estudiantes/cursos/course-1#clases");
    expect(mocks.organization).not.toHaveBeenCalled();
  });
});
