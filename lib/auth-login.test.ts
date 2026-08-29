import { describe, expect, it, vi } from "vitest";
import {
  ensureOAuthUserRole,
  extractOAuthProfile,
  getOAuthLoginErrorMessage,
  missingOAuthProfileFields,
} from "@/lib/auth-login";

describe("preparación del acceso OAuth", () => {
  it("normaliza el perfil de Google sin asumir tipos válidos", () => {
    expect(
      extractOAuthProfile({
        given_name: "  María   Alejandra ",
        family_name: " Calderón Rojas ",
        name: { valor: "no es texto" },
      }),
    ).toEqual({
      firstName: "María Alejandra",
      lastName: "Calderón Rojas",
      name: "María Alejandra Calderón Rojas",
    });
  });

  it("deriva nombre y apellido cuando Google sólo informa el nombre completo", () => {
    expect(extractOAuthProfile({ name: "María Calderón Rojas" })).toEqual({
      firstName: "María",
      lastName: "Calderón Rojas",
      name: "María Calderón Rojas",
    });
  });

  it("sólo completa campos de perfil que todavía están vacíos", () => {
    expect(
      missingOAuthProfileFields(
        { firstName: "Nombre elegido", lastName: "", name: "" },
        { firstName: "Google", lastName: "Apellido", name: "Google Apellido" },
      ),
    ).toEqual({ lastName: "Apellido", name: "Google Apellido" });
  });

  it("asigna estudiante únicamente a una cuenta que todavía no tiene rol", async () => {
    const update = vi.fn(async (id: string, data: Record<string, string>) => ({
      id,
      ...data,
    }));
    const pb = { collection: () => ({ update }) };

    await expect(ensureOAuthUserRole(pb, { id: "user-1", role: "" })).resolves.toMatchObject({
      role: "estudiante",
    });
    expect(update).toHaveBeenCalledWith("user-1", { role: "estudiante" });

    const existing = { id: "user-2", role: "docente" };
    await expect(ensureOAuthUserRole(pb, existing)).resolves.toBe(existing);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("distingue cancelación, almacenamiento y conectividad en los mensajes", () => {
    expect(getOAuthLoginErrorMessage({ message: "access_denied" })).toContain("cancelado");
    expect(getOAuthLoginErrorMessage({ name: "QuotaExceededError" })).toContain("navegador");
    expect(getOAuthLoginErrorMessage({ status: 0 })).toContain("conexión");
    expect(getOAuthLoginErrorMessage(new Error("inesperado"))).not.toContain("no está autorizada");
  });
});
