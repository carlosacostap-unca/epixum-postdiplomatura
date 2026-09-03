import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import CourseAccessSettings from "./CourseAccessSettings";
import { updateCourseEnrollmentMode } from "@/lib/actions-course-enrollment";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/lib/actions-course-enrollment", () => ({ updateCourseEnrollmentMode: vi.fn() }));

describe("CourseAccessSettings", () => {
  it("cambia la modalidad conservando explícitamente la información existente", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCourseEnrollmentMode).mockResolvedValue({ success: true, message: "Actualizada" });
    render(<ToastProvider><CourseAccessSettings courseId="course-1" initialMode="clave" /></ToastProvider>);
    expect(screen.getByText(/no elimina matrículas, invitaciones ni actividad/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Cómo ingresan los alumnos" }), "invitacion_contrasena");
    await user.click(screen.getByRole("button", { name: "Guardar modalidad" }));
    expect(updateCourseEnrollmentMode).toHaveBeenCalledWith("course-1", "invitacion_contrasena");
  });
});
