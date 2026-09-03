import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@/types";
import { ToastProvider } from "@/components/ui";

const mocks = vi.hoisted(() => ({ updateUserAdminAccess: vi.fn(async () => ({ success: true })) }));
vi.mock("@/lib/actions", () => ({ updateUserAdminAccess: mocks.updateUserAdminAccess }));

import UserRoleSelect from "./UserRoleSelect";

const user: User = { id: "u1", collectionId: "users", collectionName: "users", created: "", updated: "", username: "ana", email: "ana@example.com", name: "Ana", role: "estudiante" };

describe("UserRoleSelect", () => {
  it("solicita confirmación antes de modificar privilegios", async () => {
    const actor = userEvent.setup();
    render(<ToastProvider><UserRoleSelect user={user} /></ToastProvider>);

    await actor.selectOptions(screen.getByRole("combobox", { name: "Acceso administrativo de Ana" }), "admin");
    expect(mocks.updateUserAdminAccess).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Confirmar acceso administrativo" })).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(mocks.updateUserAdminAccess).toHaveBeenCalledWith("u1", true);
    expect(await screen.findByRole("status")).toHaveTextContent("Acceso actualizado");
  });
});
