import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorState } from "./error-state";

describe("ErrorState", () => {
  it("expone el error y permite reintentar con teclado", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<ErrorState title="No pudimos cargar" description="Intentá nuevamente." onRetry={retry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar");
    await user.tab();
    expect(screen.getByRole("button", { name: "Reintentar" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(retry).toHaveBeenCalledOnce();
  });
});
