"use client";

import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Dialog } from "./dialog";

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir edición</button>
      <Dialog open={open} onOpenChange={setOpen} title="Editar perfil" description="Actualizá tus datos.">
        <label htmlFor="dialog-name">Nombre</label>
        <input id="dialog-name" />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("etiqueta el diálogo, mueve el foco y lo devuelve al cerrar", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole("button", { name: "Abrir edición" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Editar perfil" });
    expect(dialog).toHaveAccessibleDescription("Actualizá tus datos.");
    expect(screen.getByRole("button", { name: "Cerrar diálogo" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cerrar diálogo" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
