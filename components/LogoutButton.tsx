"use client";

import { useTransition } from "react";
import pb from "@/lib/pocketbase";
import { clearAuthCookieAndRedirect } from "@/lib/actions-auth";

export default function LogoutButton({ className, iconOnly }: { className?: string, iconOnly?: boolean }) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    // Limpiar auth store del lado del cliente
    pb.authStore.clear();
    
    // Limpiar cookie httpOnly y redirigir
    startTransition(() => {
      clearAuthCookieAndRedirect();
    });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className}
      disabled={isPending}
      aria-busy={isPending || undefined}
      aria-label={iconOnly ? (isPending ? "Cerrando sesión" : "Cerrar sesión") : undefined}
    >
      <span className={`material-symbols-outlined ${isPending ? "animate-spin" : ""}`} aria-hidden="true">
        {isPending ? "progress_activity" : "logout"}
      </span>
      {!iconOnly && <span>{isPending ? "Cerrando…" : "Cerrar sesión"}</span>}
    </button>
  );
}
