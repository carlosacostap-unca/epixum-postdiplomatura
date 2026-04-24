"use client";

import { useState, useEffect } from "react";
import pb from "@/lib/pocketbase";
import Link from "next/link";
import { setAuthCookieAndRedirect } from "@/lib/actions-auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if already logged in
  useEffect(() => {
    if (pb.authStore.isValid && pb.authStore.model) {
      const role = pb.authStore.model.role;
      if (role === "docente") {
        router.push("/docentes");
      } else if (role === "admin") {
        router.push("/admin/courses");
      } else if (role === "estudiante") {
        router.push("/estudiantes");
      } else {
        // Rol desconocido o vacío: limpiar sesión y quedarse en login
        pb.authStore.clear();
      }
    }
  }, [router]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    let token = null;
    let model = null;

    try {
      const authData = await pb.collection("users").authWithOAuth2({ provider: "google" });

      // Si el usuario no tiene rol (primera vez), asignar "estudiante" por defecto
      if (!authData.record.role) {
        const updateData: Record<string, any> = { role: "estudiante" };
        const meta = (authData as any).meta;
        if (meta) {
          const firstName = meta.givenName || meta.given_name || "";
          const lastName = meta.familyName || meta.family_name || "";
          const fullName = meta.name || "";
          if (firstName) updateData.firstName = firstName;
          if (lastName) updateData.lastName = lastName;
          if (firstName || lastName) {
            updateData.name = `${firstName} ${lastName}`.trim();
          } else if (fullName) {
            updateData.name = fullName;
            const parts = fullName.split(" ");
            updateData.firstName = parts[0];
            if (parts.length > 1) updateData.lastName = parts.slice(1).join(" ");
          }
        }
        await pb.collection("users").update(authData.record.id, updateData);
        authData.record.role = "estudiante";
        pb.authStore.save(pb.authStore.token, authData.record);
      }

      // Store token in cookie for server-side access
      token = pb.authStore.token;
      model = pb.authStore.model;
      
      if (!token || !model) {
        throw new Error("No se pudo obtener el token o el modelo del usuario.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Tu cuenta de email no está autorizada para ingresar a la plataforma.");
      setIsLoading(false);
      return;
    }

    // Ejecutar la redirección fuera del bloque try-catch
    // ya que Next.js implementa `redirect()` lanzando un error especial
    // que no debe ser atrapado por el catch.
    if (token && model) {
      await setAuthCookieAndRedirect(token, model);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-on-surface)] flex flex-col items-center justify-center relative overflow-hidden font-body p-6">
      {/* Background elements - Ambient Glow */}
      <div className="absolute -z-10 top-0 left-0 w-full h-full opacity-[0.06] pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[var(--color-primary)] via-transparent to-transparent blur-[60px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[var(--color-tertiary)] via-transparent to-transparent blur-[60px]"></div>
      </div>

      <div className="w-full max-w-md bg-[var(--color-surface-container-low)] rounded-[2rem] p-10 lg:p-12 shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-[var(--color-outline-variant)]/10 backdrop-blur-xl relative z-10">
        <div className="flex justify-center mb-10">
          <div className="w-20 h-20 bg-[var(--color-surface-container-highest)] rounded-[1.5rem] flex items-center justify-center shadow-[0_0_40px_rgba(63,255,139,0.06)]">
             <span className="material-symbols-outlined text-[var(--color-primary)] text-4xl">rocket_launch</span>
          </div>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-headline tracking-tight mb-3 text-[var(--color-on-surface)]">Epixum</h1>
          <p className="text-lg text-[var(--color-on-surface-variant)]">Plataforma de PostDiplomatura</p>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-[1rem] bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full h-14 relative group overflow-hidden rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Background with gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-container)] opacity-90 group-hover:opacity-100 transition-opacity"></div>
            
            {/* Content */}
            <div className="relative h-full flex items-center justify-center gap-3 text-[#000000] font-headline font-bold text-lg tracking-wide">
              {isLoading ? (
                <span className="material-symbols-outlined animate-spin">refresh</span>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continuar con Google
                </>
              )}
            </div>
          </button>

          <div className="text-center mt-8">
             <Link href="/" className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)] transition-colors text-sm font-medium flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Volver al inicio
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
