import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CourseKeyManager from "./CourseKeyManager";

const updatePassword = vi.fn().mockResolvedValue({ success: true, message: "Actualizada" });
vi.mock("@/lib/actions-course-enrollment", () => ({
  updateCourseEnrollmentKey: vi.fn(),
  updateCourseInvitationPassword: (...args: unknown[]) => updatePassword(...args),
}));

describe("CourseKeyManager", () => {
  it("usa contraseña protegida en cursos con doble validación", async () => {
    const user = userEvent.setup();
    render(<CourseKeyManager courseId="course-1" enrollmentMode="invitacion_contrasena" />);
    const input = screen.getByLabelText("Nueva contraseña compartida");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveAttribute("minlength", "8");
    await user.type(input, "Segura-123");
    await user.click(screen.getByRole("button", { name: "Guardar nueva contraseña" }));
    expect(updatePassword).toHaveBeenCalledWith("course-1", "Segura-123");
    expect(await screen.findByRole("status")).toHaveTextContent("Actualizada");
  });
});
