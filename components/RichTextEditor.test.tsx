import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import RichTextEditor from "./RichTextEditor";

describe("RichTextEditor", () => {
  const geometry = ["getClientRects", "getBoundingClientRect"] as const;
  const originalGeometry = geometry.map((name) => Object.getOwnPropertyDescriptor(Range.prototype, name));
  beforeAll(() => {
    // jsdom no calcula geometría; ProseMirror la consulta al devolver el foco.
    Object.defineProperty(Range.prototype, "getClientRects", { configurable: true, value: () => [] });
    Object.defineProperty(Range.prototype, "getBoundingClientRect", { configurable: true, value: () => new DOMRect() });
  });
  afterAll(() => geometry.forEach((name, index) => {
    const descriptor = originalGeometry[index];
    if (descriptor) Object.defineProperty(Range.prototype, name, descriptor);
    else Reflect.deleteProperty(Range.prototype, name);
  }));

  it("actualiza el estado accesible al activar y desactivar negrita", async () => {
    const onChange = vi.fn();
    render(<RichTextEditor content="<p>Texto del curso</p>" onChange={onChange} />);
    const bold = await screen.findByRole("button", { name: "Negrita" });
    expect(bold).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(bold);
    await waitFor(() => expect(bold).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("textbox", { name: "Descripción" })).toHaveTextContent("Texto del curso");

    fireEvent.click(bold);
    await waitFor(() => expect(bold).toHaveAttribute("aria-pressed", "false"));
  });
});
