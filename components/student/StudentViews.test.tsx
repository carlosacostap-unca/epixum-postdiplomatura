import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import type { Assignment, Course, Delivery } from "@/types";
import type { StudentDashboardData } from "@/lib/data";
import { studentCourseNavigation } from "@/lib/course-navigation";
import StudentDashboard from "./StudentDashboard";
import StudentCourseNavigation from "./StudentCourseNavigation";
import { StudentAssignmentRow } from "./StudentCourseOverview";

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));
vi.mock("@/lib/actions-course-enrollment", () => ({ joinCourseByKey: vi.fn() }));
vi.mock("@/lib/actions-course-invitations", () => ({ activateCourseInvitation: vi.fn() }));
const base = { collectionId: "test", collectionName: "test", created: "", updated: "" };
const course: Course = { ...base, id: "course-1", title: "Pensamiento crítico e IA", description: "Descripción", status: "en curso", organizationMode: "semanal" };
const finished: Course = { ...course, id: "course-2", title: "Innovación digital", status: "finalizado" };
const empty: StudentDashboardData = { courses: [], nextActivityByCourse: {}, nextClass: null, pendingAssignments: [], pendingAssignmentCount: 0, pendingInquiries: [], pendingInquiryCount: 0 };
const assignment: Assignment = { ...base, id: "tp-1", title: "Analizar una respuesta", description: "", course: course.id, dueDate: "2026-11-03T18:00:00Z" };

describe("vistas compactas del estudiante", () => {
  it('identifica borradores sin confundirlos con cursos finalizados y permite filtrarlos', () => {
    const draft = {...course,id:'draft-course',title:'Curso invitado',status:'borrador' as const};
    render(<ToastProvider><StudentDashboard dashboard={{...empty,courses:[draft,finished]}} invitations={[]} firstName="Ana" status="borrador"/></ToastProvider>);
    const row=screen.getByRole('link',{name:/Curso invitado/});
    expect(row).toHaveTextContent('Borrador');
    expect(row).not.toHaveTextContent('Finalizado');
    expect(screen.queryByRole('link',{name:/Innovación digital/})).not.toBeInTheDocument();
    expect(screen.getByRole('link',{name:'Borradores'})).toHaveAttribute('aria-current','page');
  });
  it("busca y filtra matrículas y mantiene el texto de búsqueda al cambiar de estado", () => {
    render(<ToastProvider><StudentDashboard dashboard={{ ...empty, courses: [course, finished] }} invitations={[]} firstName="Ana" query="innovación" status="finalizado" /></ToastProvider>);
    const list = screen.getByRole("region", { name: "Mis cursos" });
    expect(within(list).getByRole("link", { name: /Innovación digital/ })).toHaveAttribute("href", "/estudiantes/cursos/course-2");
    expect(within(list).queryByRole("link", { name: /Pensamiento crítico/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "En curso" })).toHaveAttribute("href", "/estudiantes?buscar=innovaci%C3%B3n&estado=en+curso#mis-cursos");
  });

  it("prioriza la entrega anterior a la próxima clase y conserva los destinos de cada actividad", () => {
    render(<ToastProvider><StudentDashboard dashboard={{ ...empty, courses: [course], pendingAssignments: [assignment], pendingAssignmentCount: 1, nextClass: { ...base, id: "class-1", course: course.id, title: "Clase siguiente", description: "", date: "2026-11-04T18:00:00Z" } }} invitations={[]} firstName="Ana" /></ToastProvider>);
    expect(screen.getByRole("link", { name: /Ver trabajo/ })).toHaveAttribute("href", "/estudiantes/cursos/course-1/tps/tp-1");
    expect(screen.getByRole("region", { name: "Próximas entregas" })).toHaveTextContent(assignment.title);
  });

  it("muestra la ausencia de matrículas y mantiene los accesos de matrícula e invitación separados", () => {
    const invitation = { ...base, id: "invite-1", course: course.id, emailNormalized: "ana@example.com", status: "pendiente" as const, expand: { course } };
    render(<ToastProvider><StudentDashboard dashboard={empty} invitations={[invitation]} firstName="Ana" /></ToastProvider>);
    expect(screen.getByRole("button", { name: /Sumarme a un curso/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activar acceso" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mis cursos" })).toHaveTextContent("Todavía no tenés cursos");
    expect(screen.getByText("No tenés consultas pendientes.")).toBeInTheDocument();
  });

  it("mantiene visibles los estados vacíos de los destinos de las anclas del inicio", () => {
    render(<ToastProvider><StudentDashboard dashboard={empty} invitations={[]} firstName="Ana" /></ToastProvider>);
    expect(screen.getByRole("region", { name: "Próximas entregas" })).toHaveAttribute("id", "proximos-trabajos");
    expect(screen.getByRole("region", { name: "Mis consultas" })).toHaveAttribute("id", "mis-consultas");
  });

  it("respeta las herramientas habilitadas y navega desde el selector móvil", async () => {
    const user = userEvent.setup();
    render(<StudentCourseNavigation courseTitle={course.title} items={studentCourseNavigation({ ...course, examsEnabled: true, contentsEnabled: true })} />);
    expect(screen.getByRole("link", { name: /Unidades/ })).toHaveAttribute("href", "/estudiantes/cursos/course-1#semanas");
    expect(screen.getByRole("link", { name: /Parciales/ })).toHaveAttribute("href", "/estudiantes/cursos/course-1/parciales");
    expect(screen.queryByRole("link", { name: /Preparación/ })).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Sección del curso" }), "/estudiantes/cursos/course-1/parciales");
    expect(mocks.push).toHaveBeenCalledWith("/estudiantes/cursos/course-1/parciales");
  });

  it.each([
    [false, "Vencido sin entrega"], [true, "Admite entrega fuera de término"],
  ])("conserva la presentación de un trabajo vencido con tardías=%s", (allowLateSubmissions, label) => {
    render(<StudentAssignmentRow courseId={course.id} assignment={{ ...assignment, allowLateSubmissions }} now={new Date("2026-11-05T00:00:00Z")} />);
    expect(screen.getByRole("link", { name: new RegExp(assignment.title) })).toHaveAttribute("href", "/estudiantes/cursos/course-1/tps/tp-1");
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each([
    ["pending", undefined, 0, "Entrega registrada"],
    ["pending", undefined, 1, "Reenviado · pendiente de revisión"],
    ["published", "Aprobado", 0, "Evaluado · aprobado"],
    ["published", "Desaprobado", 0, "Evaluado · desaprobado"],
    ["published", "Corregir y reenviar", 0, "Corrección solicitada"],
  ] as const)("conserva el estado publicado de la entrega %s %s", (status, verdict, resubmissionCount, label) => {
    const delivery: Delivery = { ...base, id: "delivery-1", assignment: assignment.id, student: "student-1", repositoryUrl: "", status, verdict, resubmissionCount, submissionVersion: 1, evaluatedVersion: 1 };
    render(<StudentAssignmentRow courseId={course.id} assignment={assignment} delivery={delivery} now={new Date("2026-11-05T00:00:00Z")} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
