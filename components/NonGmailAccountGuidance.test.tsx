import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NonGmailAccountGuidance from "./NonGmailAccountGuidance";

describe("NonGmailAccountGuidance", () => {
  it("explica cómo ingresar con un correo no-Gmail y ofrece ayuda oficial", () => {
    render(<NonGmailAccountGuidance />);

    expect(
      screen.getByRole("heading", { name: "¿Tu correo no termina en @gmail.com?" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Hotmail, Yahoo u otro correo/)).toBeInTheDocument();
    expect(screen.getByText(/exactamente el mismo email/)).toBeInTheDocument();
    expect(screen.getByText(/contactá a la administración/)).toBeInTheDocument();

    const helpLink = screen.getByRole("link", {
      name: /Crear una Cuenta de Google con mi correo actual/,
    });
    expect(helpLink).toHaveAttribute(
      "href",
      "https://support.google.com/accounts/answer/27441?hl=es-419",
    );
    expect(helpLink).toHaveAttribute("target", "_blank");
    expect(helpLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});
