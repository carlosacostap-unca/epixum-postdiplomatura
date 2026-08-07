import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clear: vi.fn(),
  clearAuthCookieAndRedirect: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/pocketbase", () => ({
  default: { authStore: { clear: mocks.clear } },
}));

vi.mock("@/lib/actions-auth", () => ({
  clearAuthCookieAndRedirect: mocks.clearAuthCookieAndRedirect,
}));

import LogoutButton from "./LogoutButton";

describe("LogoutButton", () => {
  it("limpia el estado cliente y solicita limpiar la cookie del servidor", async () => {
    const user = userEvent.setup();
    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    expect(mocks.clear).toHaveBeenCalledOnce();
    await waitFor(() => expect(mocks.clearAuthCookieAndRedirect).toHaveBeenCalledOnce());
  });

  it("expone un nombre accesible en su variante de icono", () => {
    render(<LogoutButton iconOnly />);
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();
  });
});
