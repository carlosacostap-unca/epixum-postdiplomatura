"use client";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "./toast";

function ToastTrigger() {
  const { notify } = useToast();
  return (
    <button onClick={() => notify({ title: "Curso actualizado", description: "Los cambios ya están visibles.", tone: "success", duration: null })}>
      Notificar
    </button>
  );
}

describe("ToastProvider", () => {
  it("anuncia resultados y permite descartarlos", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Notificar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Curso actualizado");
    expect(screen.getByRole("status")).toHaveTextContent("Los cambios ya están visibles.");

    await user.click(screen.getByRole("button", { name: "Cerrar notificación" }));
    expect(screen.queryByText("Curso actualizado")).not.toBeInTheDocument();
  });
});
