"use server";

import PocketBase from "pocketbase";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function setAuthCookieAndRedirect(token: string) {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;

  if (!token || !url) {
    cookieStore.delete("pb_auth");
    return { success: false, error: "No se pudo iniciar la sesión." };
  }

  const serverPb = new PocketBase(url);
  serverPb.authStore.save(token, null);

  let verifiedToken: string;
  let role: unknown;

  try {
    const authData = await serverPb.collection("users").authRefresh({ requestKey: null });
    verifiedToken = authData.token;
    role = authData.record.role;
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

  // La cookie del servidor contiene solamente el JWT. El estado completo de
  // PocketBase permanece en el almacenamiento local del navegador.
  cookieStore.set("pb_auth", verifiedToken, {
    path: "/",
    maxAge: 86400,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  if (role === "docente") {
    redirect("/docentes");
  } else if (role === "admin") {
    redirect("/admin/courses");
  } else if (role === "estudiante") {
    redirect("/estudiantes");
  } else {
    redirect("/");
  }
}

export async function clearAuthCookieAndRedirect() {
  const cookieStore = await cookies();
  cookieStore.delete("pb_auth");
  redirect("/login");
}
