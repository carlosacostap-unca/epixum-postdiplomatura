import "server-only";

import { createHmac } from "node:crypto";

const MIN_KEY_LENGTH = 6;
const MAX_KEY_LENGTH = 64;

export function normalizeEnrollmentKey(value: string) {
  return value.trim().toLocaleUpperCase("es-AR");
}

export function validateEnrollmentKey(value: string) {
  const normalized = normalizeEnrollmentKey(value);

  if (normalized.length < MIN_KEY_LENGTH || normalized.length > MAX_KEY_LENGTH) {
    return {
      valid: false as const,
      error: `La clave debe tener entre ${MIN_KEY_LENGTH} y ${MAX_KEY_LENGTH} caracteres.`,
    };
  }

  return { valid: true as const, normalized };
}

export function hashEnrollmentKey(value: string) {
  const secret = process.env.COURSE_ENROLLMENT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "COURSE_ENROLLMENT_SECRET debe estar configurado con al menos 32 caracteres.",
    );
  }

  return createHmac("sha256", secret)
    .update(normalizeEnrollmentKey(value), "utf8")
    .digest("hex");
}
