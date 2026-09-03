"use server";

import PocketBase from "pocketbase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ensureOAuthUserRole,
  missingOAuthProfileFields,
  type OAuthProfile,
} from "@/lib/auth-login";
import { hasTeachingCourses } from "@/lib/course-role-access";
import { resolveWorkspaceAccess } from "@/lib/course-roles";
import { getHomeForWorkspace } from "@/lib/navigation";
import type { User } from "@/types";

export async function setAuthCookieAndRedirect(
  token: string,
  profile?: OAuthProfile,
) {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;

  if (!token || !url) {
    cookieStore.delete("pb_auth");
    return { success: false, error: "No se pudo iniciar la sesión." };
  }

  const serverPb = new PocketBase(url);
  serverPb.authStore.save(token, null);

  let authData;

  try {
    authData = await serverPb.collection("users").authRefresh({ requestKey: null });
  } catch (error) {
    cookieStore.delete("pb_auth");
    console.error(
      "No se pudo validar la sesión de PocketBase:",
      error instanceof Error ? error.message : "Error desconocido",
    );
    return {
      success: false,
      error: "La sesión de Google no pudo validarse. Intenta ingresar nuevamente.",
    };
  }

  let readyRecord;
  try {
    readyRecord = await ensureOAuthUserRole(serverPb, authData.record);
  } catch (error) {
    cookieStore.delete("pb_auth");
    console.error(
      "No se pudo completar el rol de la cuenta OAuth:",
      error instanceof Error ? error.message : "Error desconocido",
    );
    return {
      success: false,
      error: "La cuenta se verificó, pero no pudo terminar de configurarse. Intentá nuevamente.",
    };
  }

  const profileUpdate = missingOAuthProfileFields(readyRecord, profile);
  if (Object.keys(profileUpdate).length > 0) {
    try {
      await serverPb.collection("users").update(readyRecord.id, profileUpdate, {
        requestKey: null,
      });
    } catch (error) {
      // El nombre es decorativo: nunca debe impedir que una cuenta autenticada ingrese.
      console.warn(
        "No se pudo completar el perfil OAuth:",
        error instanceof Error ? error.message : "Error desconocido",
      );
    }
  }

  try {
    authData = await serverPb.collection("users").authRefresh({ requestKey: null });
  } catch (error) {
    cookieStore.delete("pb_auth");
    console.error(
      "No se pudo renovar la sesión después de completar la cuenta OAuth:",
      error instanceof Error ? error.message : "Error desconocido",
    );
    return {
      success: false,
      error: "La cuenta se configuró, pero la sesión no pudo renovarse. Intentá ingresar nuevamente.",
    };
  }

  const verifiedToken = authData.token;
  const user = authData.record as unknown as User;
  const role = user.role;

  if (!(["admin", "docente", "estudiante"] as string[]).includes(role)) {
    cookieStore.delete("pb_auth");
    return {
      success: false,
      error: "La cuenta no tiene un rol habilitado para ingresar.",
    };
  }

  // La cookie HttpOnly es la fuente persistente de la sesión. El cliente OAuth
  // conserva el token sólo en memoria durante este intercambio.
  cookieStore.set("pb_auth", verifiedToken, {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  const workspaceAccess = resolveWorkspaceAccess(user, await hasTeachingCourses(serverPb, user.id));
  redirect(getHomeForWorkspace(workspaceAccess.preferred));
}

export async function clearAuthCookieAndRedirect() {
  const cookieStore = await cookies();
  cookieStore.delete("pb_auth");
  redirect("/login");
}
