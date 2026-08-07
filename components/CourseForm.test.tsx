import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import CourseForm from "./CourseForm";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/actions-courses", () => ({ createCourse: vi.fn(), updateCourse: vi.fn() }));
vi.mock("@/components/RichTextEditor", () => ({ default: () => <div data-testid="editor" /> }));

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
});
