import test from "node:test";
import assert from "node:assert/strict";
import { assertAllowedCollection, assertJsonSize, sanitize, toToolError, toToolResult } from "./lib.mjs";

test("permite colecciones de aplicación y bloquea las internas", () => {
  assert.equal(assertAllowedCollection("course_enrollments"), "course_enrollments");
  assert.throws(() => assertAllowedCollection("_superusers"), /internas/);
  assert.throws(() => assertAllowedCollection("courses/records"), /no es válido/);
});

test("elimina secretos de respuestas anidadas", () => {
  assert.deepEqual(
    sanitize({ email: "docente@example.com", authToken: "abc", nested: { clientSecret: "xyz" } }),
    { email: "docente@example.com", authToken: "[REDACTED]", nested: { clientSecret: "[REDACTED]" } },
  );
});

test("limita el tamaño de escrituras y respuestas", () => {
  assert.doesNotThrow(() => assertJsonSize({ title: "ok" }, 100));
  assert.throws(() => assertJsonSize({ title: "demasiado largo" }, 10), /exceden/);
  assert.equal(toToolResult({ ok: true }).structuredContent.ok, true);
});

test("convierte errores de PocketBase sin incluir secretos", () => {
  const result = toToolError({
    status: 400,
    message: "Datos inválidos",
    response: { data: { password: "visible-no", email: { message: "Duplicado" } } },
  });
  assert.equal(result.isError, true);
  assert.doesNotMatch(result.content[0].text, /visible-no/);
  assert.match(result.content[0].text, /Duplicado/);
});
