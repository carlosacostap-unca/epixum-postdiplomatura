import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@/types";
import { ToastProvider } from "@/components/ui";

const mocks = vi.hoisted(() => ({ updateUserRole: vi.fn(async () => ({ success: true })) }));
vi.mock("@/lib/actions", () => ({ updateUserRole: mocks.updateUserRole }));

import UserRoleSelect from "./UserRoleSelect";

const user: User = { id: "u1", collectionId: "users", collectionName: "users", created: "", updated: "", username: "ana", email: "ana@example.com", name: "Ana", role: "estudiante" };

describe("UserRoleSelect", () => {
  it("solicita confirmación antes de modificar privilegios", async () => {
    const actor = userEvent.setup();
    render(<ToastProvider><UserRoleSelect user={user} /></ToastProvider>);

    await actor.selectOptions(screen.getByRole("combobox", { name: "Rol de Ana" }), "docente");
    expect(mocks.updateUserRole).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Confirmar cambio de rol" })).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "Cambiar rol" }));
    expect(mocks.updateUserRole).toHaveBeenCalledWith("u1", "docente");
    expect(await screen.findByRole("status")).toHaveTextContent("Rol actualizado");
  });
});
