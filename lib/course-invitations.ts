const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 64;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedInvitationEmails {
  valid: string[];
  invalid: string[];
  duplicates: string[];
}

export function normalizeInvitationEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidInvitationEmail(value: string) {
  const normalized = normalizeInvitationEmail(value);
  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized);
}

export function parseInvitationEmails(value: string): ParsedInvitationEmails {
  const valid: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();

  for (const raw of value.split(/[\n,;]/)) {
    const normalized = normalizeInvitationEmail(raw);
    if (!normalized) continue;
    if (!isValidInvitationEmail(normalized)) {
      invalid.push(normalized);
      continue;
    }
    if (seen.has(normalized)) {
      duplicates.push(normalized);
      continue;
    }
    seen.add(normalized);
    valid.push(normalized);
  }

  return { valid, invalid, duplicates };
}

export function validateInvitationPassword(value: string) {
  if (value.length < MIN_PASSWORD_LENGTH || value.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false as const,
      error: `La contraseña debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres.`,
    };
  }
  if (!value.trim()) {
    return { valid: false as const, error: "La contraseña no puede contener solamente espacios." };
  }
  return { valid: true as const, password: value };
}

export const INVITATION_ATTEMPT_LIMIT = 5;
export const INVITATION_LOCK_MINUTES = 15;

export interface InvitationAttemptTimestamp {
  created: string;
}

export interface InvitationLockState {
  blocked: boolean;
  attemptsRemaining: number;
  lockedUntil?: string;
}

export function getInvitationLockState(
  attempts: InvitationAttemptTimestamp[],
  now = new Date(),
): InvitationLockState {
  const windowMs = INVITATION_LOCK_MINUTES * 60 * 1000;
  const cutoff = now.getTime() - windowMs;
  const activeAttempts = attempts
    .map((attempt) => new Date(attempt.created).getTime())
    .filter((created) => Number.isFinite(created) && created > cutoff && created <= now.getTime())
    .sort((left, right) => left - right);

  if (activeAttempts.length < INVITATION_ATTEMPT_LIMIT) {
    return {
      blocked: false,
      attemptsRemaining: INVITATION_ATTEMPT_LIMIT - activeAttempts.length,
    };
  }

  const lockedUntil = new Date(activeAttempts[INVITATION_ATTEMPT_LIMIT - 1] + windowMs);
  if (lockedUntil.getTime() <= now.getTime()) {
    return { blocked: false, attemptsRemaining: 1 };
  }

  return { blocked: true, attemptsRemaining: 0, lockedUntil: lockedUntil.toISOString() };
}
