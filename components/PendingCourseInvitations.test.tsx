import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CourseEnrollmentInvitation } from "@/types";
import PendingCourseInvitations from "./PendingCourseInvitations";

const mocks = vi.hoisted(() => ({
  activate: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/actions-course-invitations", () => ({
  activateCourseInvitation: (...args: unknown[]) => mocks.activate(...args),
}));

function invitation(id: string, title: string): CourseEnrollmentInvitation {
  return {
    id,
    collectionId: "invitations",
    collectionName: "course_enrollment_invitations",
    created: "2026-08-07 10:00:00.000Z",
    updated: "2026-08-07 10:00:00.000Z",
    course: `course-${id}`,
    emailNormalized: "alumno@epixum.com",
    status: "pendiente",
    expand: {
      course: {
        id: `course-${id}`,
        collectionId: "courses",
        collectionName: "courses",
        created: "2026-08-07",
        updated: "2026-08-07",
        title,
        description: "",
        status: "en curso",
        enrollmentMode: "invitacion_contrasena",
      },
    },
  };
}

describe("PendingCourseInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activate.mockReset();
    mocks.activate.mockResolvedValue({ success: true, courseId: "course-inv-1" });
  });

  it("no muestra una sección cuando no hay invitaciones", () => {
    const { container } = render(<PendingCourseInvitations invitations={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("muestra una o varias invitaciones sin incorporarlas a Mis cursos", () => {
    const { rerender } = render(<PendingCourseInvitations invitations={[invitation("inv-1", "Node.js")]} />);
    expect(screen.getByText("Node.js")).toBeInTheDocument();
    rerender(<PendingCourseInvitations invitations={[invitation("inv-1", "Node.js"), invitation("inv-2", "React")]} />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getAllByText("La invitación todavía no forma parte de Mis cursos.")).toHaveLength(2);
  });

  it("abre el diálogo con foco accesible y conserva la contraseña ante un error", async () => {
    const user = userEvent.setup();
    mocks.activate.mockResolvedValueOnce({ success: false, error: "La contraseña no es correcta.", attemptsRemaining: 4 });
    render(<PendingCourseInvitations invitations={[invitation("inv-1", "Node.js")]} />);
    await user.click(screen.getByRole("button", { name: "Activar curso" }));
    const password = screen.getByLabelText("Contraseña del curso");
    await waitFor(() => expect(password).toHaveFocus());
    await user.type(password, "Incorrecta-1{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Te quedan 4 intentos");
    expect(password).toHaveValue("Incorrecta-1");
  });

  it("deshabilita nuevos intentos durante el bloqueo", async () => {
    const user = userEvent.setup();
    mocks.activate.mockResolvedValueOnce({ success: false, error: "Alcanzaste el límite de intentos.", attemptsRemaining: 0, lockedUntil: "2026-08-07T18:15:00.000Z" });
    render(<PendingCourseInvitations invitations={[invitation("inv-1", "Node.js")]} />);
    await user.click(screen.getByRole("button", { name: "Activar curso" }));
    await user.type(screen.getByLabelText("Contraseña del curso"), "Incorrecta-1{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("volver a intentarlo");
    expect(screen.getByLabelText("Contraseña del curso")).toBeDisabled();
  });

  it("refresca Mis cursos y ofrece acceso directo al activar", async () => {
    const user = userEvent.setup();
    render(<PendingCourseInvitations invitations={[invitation("inv-1", "Node.js")]} />);
    await user.click(screen.getByRole("button", { name: "Activar curso" }));
    await user.type(screen.getByLabelText("Contraseña del curso"), "Correcta-1{Enter}");
    expect(await screen.findByRole("status")).toHaveTextContent("correctamente");
    expect(screen.getByRole("link", { name: "Abrir curso" })).toHaveAttribute("href", "/estudiantes/cursos/course-inv-1");
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
