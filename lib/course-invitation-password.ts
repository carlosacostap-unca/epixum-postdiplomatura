import "server-only";

import { createHmac } from "node:crypto";

export function hashInvitationPassword(value: string) {
  const secret = process.env.COURSE_ENROLLMENT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("COURSE_ENROLLMENT_SECRET debe estar configurado con al menos 32 caracteres.");
  }
  return createHmac("sha256", secret).update(value, "utf8").digest("hex");
}
