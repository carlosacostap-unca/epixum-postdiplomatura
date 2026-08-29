export type OAuthProfile = {
  firstName?: string;
  lastName?: string;
  name?: string;
};

type OAuthMeta = Record<string, unknown>;
type UserRecord = Record<string, unknown> & { id: string; role?: unknown };

type UserUpdateClient = {
  collection(name: "users"): {
    update(id: string, data: Record<string, string>): Promise<UserRecord>;
  };
};

const PROFILE_FIELD_MAX_LENGTH = 120;

function cleanProfileValue(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ").slice(0, PROFILE_FIELD_MAX_LENGTH);
}

export function extractOAuthProfile(meta: unknown): OAuthProfile {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};

  const values = meta as OAuthMeta;
  let firstName = cleanProfileValue(values.givenName || values.given_name);
  let lastName = cleanProfileValue(values.familyName || values.family_name);
  const fullName = cleanProfileValue(values.name);

  if (fullName && (!firstName || !lastName)) {
    const parts = fullName.split(" ").filter(Boolean);
    if (!firstName) firstName = parts[0] || "";
    if (!lastName && parts.length > 1) lastName = parts.slice(1).join(" ");
  }

  const name = fullName || [firstName, lastName].filter(Boolean).join(" ");

  return {
    ...(firstName ? { firstName } : {}),
    ...(lastName ? { lastName } : {}),
    ...(name ? { name } : {}),
  };
}

export function missingOAuthProfileFields(
  record: Record<string, unknown>,
  profile: OAuthProfile | undefined,
) {
  if (!profile) return {};

  const update: OAuthProfile = {};
  for (const field of ["firstName", "lastName", "name"] as const) {
    const value = cleanProfileValue(profile[field]);
    if (!cleanProfileValue(record[field]) && value) update[field] = value;
  }
  return update;
}

export async function ensureOAuthUserRole(
  pb: UserUpdateClient,
  record: UserRecord,
) {
  if (typeof record.role === "string" && record.role) return record;
  return pb.collection("users").update(record.id, { role: "estudiante" });
}

function errorText(error: unknown) {
  if (!error || typeof error !== "object") return String(error || "").toLowerCase();
  const value = error as {
    name?: unknown;
    message?: unknown;
    response?: { message?: unknown };
    originalError?: { message?: unknown };
  };
  return [
    value.name,
    value.message,
    value.response?.message,
    value.originalError?.message,
  ]
    .filter((item): item is string => typeof item === "string")
    .join(" ")
    .toLowerCase();
}

export function getOAuthLoginErrorMessage(error: unknown) {
  const text = errorText(error);
  const status =
    error && typeof error === "object" && "status" in error
      ? Number((error as { status?: unknown }).status)
      : undefined;

  if (/access_denied|cancel|closed|abort/.test(text)) {
    return "El acceso con Google fue cancelado. Volvé a intentarlo y completá la selección de cuenta.";
  }

  if (/localstorage|storage|quota|securityerror/.test(text)) {
    return "El navegador impidió guardar la sesión. Habilitá los datos del sitio o probá desde otro navegador.";
  }

  if (status === 0) {
    return "No pudimos comunicarnos correctamente con Google. Revisá la conexión o probá desde otro navegador.";
  }

  return "No pudimos completar el acceso con Google. Intentá nuevamente o probá desde otro navegador.";
}
