import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CourseOnboardingSummary } from "./CourseOnboardingSummary";

const read = vi.hoisted(() => vi.fn());
vi.mock("@/lib/course-onboarding-data", () => ({ getStudentOnboarding: read }));

describe("resumen compacto de onboarding", () => {
  it("destaca una etapa pendiente y conserva los requisitos completos al desplegar", async () => {
    const user = userEvent.setup();
    read.mockResolvedValueOnce({ progress: null, survey: null });
    render(await CourseOnboardingSummary({ courseId: "course-1", compact: true }));
    expect(screen.getByText(/Etapa 1 de 3 pendiente/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Continuar onboarding/ })).toHaveAttribute("href", "/estudiantes/cursos/course-1/onboarding");
    await user.click(screen.getByText("Ver requisitos de las prácticas"));
    expect(screen.getByRole("heading", { name: "Preparate para las clases en vivo" })).toBeVisible();
    expect(screen.getByRole("link", { name: /Ver mi onboarding/ })).toBeVisible();
  });

  it("solo muestra completo cuando los datos lo confirman y conserva el aviso para principiantes", async () => {
    const user = userEvent.setup();
    read.mockResolvedValueOnce({ progress: { profileConfirmedAt: "2026-10-20", completedAt: "2026-10-20" }, survey: { answers: { experience: "never" } } });
    render(await CourseOnboardingSummary({ courseId: "course-1", compact: true }));
    expect(screen.queryByRole("link", { name: /Continuar onboarding/ })).not.toBeInTheDocument();
    await user.click(screen.getByText("Onboarding completo"));
    expect(screen.getByRole("note")).toBeVisible();
  });
});
