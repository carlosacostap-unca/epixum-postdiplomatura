import { beforeEach, describe, expect, it } from "vitest";
import {
  isValidInvitationEmail,
  getInvitationLockState,
  normalizeInvitationEmail,
  parseInvitationEmails,
  validateInvitationPassword,
} from "./course-invitations";
import { hashInvitationPassword } from "./course-invitation-password";

describe("invitaciones por email y contraseña", () => {
  beforeEach(() => {
    process.env.COURSE_ENROLLMENT_SECRET = "secret-for-tests-with-at-least-32-characters";
  });

  it("normaliza email ignorando espacios exteriores y mayúsculas", () => {
    expect(normalizeInvitationEmail("  Alumno@EPIXUM.COM ")).toBe("alumno@epixum.com");
    expect(isValidInvitationEmail("alumno@epixum.com")).toBe(true);
    expect(isValidInvitationEmail("sin-dominio@")).toBe(false);
  });

  it("separa listas, deduplica e informa inválidos", () => {
    expect(parseInvitationEmails("A@Epixum.com, b@epixum.com\n a@epixum.com; inválido")).toEqual({
      valid: ["a@epixum.com", "b@epixum.com"],
      invalid: ["inválido"],
      duplicates: ["a@epixum.com"],
    });
  });

  it("valida límites sin normalizar la contraseña", () => {
    expect(validateInvitationPassword("Corta1!").valid).toBe(false);
    expect(validateInvitationPassword("        ").valid).toBe(false);
    expect(validateInvitationPassword("Segura-1").valid).toBe(true);
    expect(validateInvitationPassword("x".repeat(65)).valid).toBe(false);
  });

  it("produce hashes distintos cuando cambia una mayúscula", () => {
    expect(hashInvitationPassword("Clave-ABC")).not.toBe(hashInvitationPassword("clave-ABC"));
    expect(hashInvitationPassword("Clave-ABC")).toHaveLength(64);
  });

  it("bloquea desde el quinto intento reciente durante 15 minutos", () => {
    const now = new Date("2026-08-07T15:00:00.000Z");
    const attempts = [1, 2, 3, 4, 5].map((minutesAgo) => ({
      created: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    }));
    expect(getInvitationLockState(attempts, now)).toMatchObject({ blocked: true, attemptsRemaining: 0 });
  });

  it("descarta intentos cuando vence la ventana móvil", () => {
    const now = new Date("2026-08-07T15:00:00.000Z");
    const attempts = [16, 17, 18, 19, 20].map((minutesAgo) => ({
      created: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
    }));
    expect(getInvitationLockState(attempts, now)).toEqual({ blocked: false, attemptsRemaining: 5 });
  });
});
