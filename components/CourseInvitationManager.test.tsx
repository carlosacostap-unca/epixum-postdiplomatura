import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui";
import type { CourseEnrollmentInvitation } from "@/types";
import CourseInvitationManager from "./CourseInvitationManager";

const createInvitations = vi.fn().mockResolvedValue({ success: true, created: ["a@epixum.com"], existing: [], revoked: [], invalid: [], duplicates: [] });
const revokeInvitation = vi.fn().mockResolvedValue({ success: true });
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions-course-invitations", () => ({
  createCourseInvitations: (...args: unknown[]) => createInvitations(...args),
  revokeCourseInvitation: (...args: unknown[]) => revokeInvitation(...args),
}));

const base = { id: "inv-1", collectionId: "inv", collectionName: "course_enrollment_invitations", created: "2026-08-07", updated: "2026-08-07", course: "course-1", emailNormalized: "pendiente@epixum.com", status: "pendiente" } as CourseEnrollmentInvitation;

function renderManager(invitations: CourseEnrollmentInvitation[] = []) {
  return render(<ToastProvider><CourseInvitationManager courseId="course-1" enabled invitations={invitations} page={1} totalPages={1} /></ToastProvider>);
}

describe("CourseInvitationManager", () => {
  it("previsualiza y confirma una carga masiva accesible", async () => {
    const user = userEvent.setup();
    renderManager();
    const textarea = screen.getByLabelText("Carga masiva");
    await user.type(textarea, "A@Epixum.com, inválido; a@epixum.com");
    expect(screen.getByText("1 válidos · 1 inválidos · 1 repetidos")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirmar carga masiva" }));
    expect(createInvitations).toHaveBeenCalledWith("course-1", "A@Epixum.com, inválido; a@epixum.com");
  });

  it("confirma antes de revocar una invitación pendiente", async () => {
    const user = userEvent.setup();
    renderManager([base]);
    await user.click(screen.getByRole("button", { name: "Revocar" }));
    const dialog = screen.getByRole("dialog", { name: "Revocar invitación" });
    expect(dialog).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Revocar" }));
    expect(revokeInvitation).toHaveBeenCalledWith("inv-1");
  });
});
