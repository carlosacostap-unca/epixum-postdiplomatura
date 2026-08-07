"use client";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import type { Class, CourseWeek } from "@/types";
import TeacherWeeklyCourseManager from "./TeacherWeeklyCourseManager";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/lib/actions-course-weeks", () => ({
  assignContentToWeek: vi.fn().mockResolvedValue({ success: true }),
  createCourseWeek: vi.fn().mockResolvedValue({ success: true, weekId: "new-week" }),
  deleteCourseWeek: vi.fn().mockResolvedValue({ success: true }),
  updateCourseWeek: vi.fn().mockResolvedValue({ success: true, weekId: "week-1" }),
}));

const base = { collectionId: "test", collectionName: "test", created: "2026-08-06T12:00:00.000Z", updated: "2026-08-06T12:00:00.000Z" };
const week: CourseWeek = { ...base, id: "week-1", course: "course-1", number: 1, title: "Fundamentos", status: "publicada" };
const classItem: Class = { ...base, id: "class-1", title: "Introducción", description: "", date: "", course: "course-1" };

function renderManager() {
  return render(
    <ToastProvider>
      <TeacherWeeklyCourseManager
        courseId="course-1"
        weeks={[week]}
        groups={[{ week, classes: [], assignments: [], inquiries: [] }]}
        unassigned={{ classes: [classItem], assignments: [], inquiries: [] }}
      />
    </ToastProvider>,
  );
}

describe("TeacherWeeklyCourseManager", () => {
  beforeEach(() => refresh.mockClear());

  it("permite abrir y recorrer el formulario de semana sólo con teclado", async () => {
    const user = userEvent.setup();
    renderManager();

    await user.tab();
    const trigger = screen.getByRole("button", { name: "Nueva semana" });
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("dialog", { name: "Crear semana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar diálogo" })).toHaveFocus();
    await user.tab();
    const numberInput = screen.getByRole("spinbutton", { name: /Número/ });
    expect(numberInput).toHaveFocus();
    expect(numberInput).toHaveAttribute("min", "0");
    await user.tab();
    expect(screen.getByRole("textbox", { name: /Título/ })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cerrar diálogo" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("expone la bandeja sin asignar con selector y acción táctil", () => {
    renderManager();
    expect(screen.getByRole("heading", { name: "Contenido sin semana" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Semana para Introducción" })).toHaveValue("");
    expect(screen.getAllByRole("button", { name: "Mover" })[0]).toHaveClass("min-h-11");
  });
});
