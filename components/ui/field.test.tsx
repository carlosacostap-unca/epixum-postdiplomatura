import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";

describe("Field", () => {
  it("relaciona etiqueta, ayuda y error con el control", () => {
    render(
      <Field label="Clave del curso" hint="Pedila a tu docente." error="La clave no es válida." required>
        <input />
      </Field>,
    );

    const input = screen.getByRole("textbox", { name: /Clave del curso/i });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Pedila a tu docente. La clave no es válida.");
    expect(screen.getByRole("alert")).toHaveTextContent("La clave no es válida.");
  });
});
