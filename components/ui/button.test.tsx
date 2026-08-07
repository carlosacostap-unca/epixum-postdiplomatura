import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, IconButton } from "./button";

describe("Button", () => {
  it("comunica y bloquea un estado pendiente", () => {
    render(<Button isPending pendingLabel="Guardando…">Guardar</Button>);

    const button = screen.getByRole("button", { name: "Guardando…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("exige un nombre accesible para un botón de icono", () => {
    render(<IconButton label="Abrir filtros" icon={<span>tune</span>} variant="ghost" />);

    expect(screen.getByRole("button", { name: "Abrir filtros" })).toBeInTheDocument();
  });
});
