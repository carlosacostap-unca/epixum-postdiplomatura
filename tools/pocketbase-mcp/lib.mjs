const SENSITIVE_KEY = /(?:password|passwordConfirm|secret|token|authorization|privateKey)$/i;
const COLLECTION_NAME = /^[A-Za-z0-9_]+$/;

export const MAX_RESULT_BYTES = 100_000;

export function assertAllowedCollection(name) {
  if (!COLLECTION_NAME.test(name)) {
    throw new Error("El nombre o ID de la colección no es válido.");
  }
  if (name.startsWith("_")) {
    throw new Error("El acceso a colecciones internas de PocketBase está bloqueado.");
  }
  return name;
}

export function assertJsonSize(value, maxBytes = 100_000) {
  const size = Buffer.byteLength(JSON.stringify(value), "utf8");
  if (size > maxBytes) {
    throw new Error(`Los datos exceden el límite de ${maxBytes} bytes.`);
  }
}

export function sanitize(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));

  const result = {};
  for (const [key, item] of Object.entries(value)) {
    result[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : sanitize(item, seen);
  }
  return result;
}

export function toToolResult(data) {
  const safeData = sanitize(data);
  const output = JSON.stringify(safeData, null, 2);
  if (Buffer.byteLength(output, "utf8") > MAX_RESULT_BYTES) {
    throw new Error("La respuesta supera 100 KB. Reduce perPage o solicita menos campos.");
  }
  return {
    content: [{ type: "text", text: output }],
    structuredContent: safeData,
  };
}

export function toToolError(error) {
  const status = Number.isInteger(error?.status) ? error.status : undefined;
  const message = error instanceof Error ? error.message : "Error desconocido";
  const details = error?.response?.data ? sanitize(error.response.data) : undefined;
  const payload = {
    error: message || "PocketBase rechazó la operación.",
    ...(status ? { status } : {}),
    ...(details && Object.keys(details).length ? { details } : {}),
  };
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}
