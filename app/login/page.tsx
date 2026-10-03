"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui";
import NonGmailAccountGuidance from "@/components/NonGmailAccountGuidance";
import pb from "@/lib/pocketbase";
import { setAuthCookieAndRedirect } from "@/lib/actions-auth";
import {
  extractOAuthProfile,
  getOAuthLoginErrorMessage,
  type OAuthProfile,
} from "@/lib/auth-login";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // El servidor elimina la cookie HttpOnly al entrar a /login; el navegador
    // debe limpiar por separado el estado persistido por el SDK de PocketBase.
    pb.authStore.clear();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    pb.authStore.clear();
    let token = null;
    let profile: OAuthProfile = {};

    try {
      const authData = await pb.collection("users").authWithOAuth2({ provider: "google" });
      token = authData.token || pb.authStore.token;
      profile = extractOAuthProfile(authData.meta);
      
      if (!token || !authData.record) {
        throw new Error("No se pudo obtener la sesión del usuario.");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(getOAuthLoginErrorMessage(err));
      setIsLoading(false);
      return;
    }

    // Ejecutar la redirección fuera del bloque try-catch
    // ya que Next.js implementa `redirect()` lanzando un error especial
    // que no debe ser atrapado por el catch.
    if (token) {
      const result = await setAuthCookieAndRedirect(token, profile, new URLSearchParams(window.location.search).get("next"));
      if (!result.success) {
        pb.authStore.clear();
        setError(result.error);
        setIsLoading(false);
      }
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-[var(--color-background)] p-4 text-[var(--color-on-surface)] sm:p-8">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[var(--epixum-radius-xl)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] lg:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[var(--color-surface-container-lowest)] p-12 lg:flex" aria-labelledby="campus-title">
          <div className="flex items-center gap-3">
            <Image src="/epixum-logo.png" alt="" width={40} height={40} className="size-10 shrink-0 object-contain" />
            <span className="font-headline text-2xl font-bold tracking-tight">epixum<span className="text-[var(--color-primary)]">.</span></span>
          </div>
          <div className="my-14">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-3 py-2 text-xs font-semibold text-[var(--color-primary)]"><span className="size-1.5 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />Tu campus virtual</span>
            <h1 id="campus-title" className="max-w-sm font-headline text-5xl font-bold leading-[1.15] tracking-tight">Tu próximo paso<br /><span className="text-[var(--color-primary)]">empieza acá.</span></h1>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-[var(--color-on-surface-variant)]">Clases, materiales y trabajos en un espacio pensado para acompañar tu aprendizaje.</p>
            <div className="mt-10 space-y-4">
              {[["menu_book", "Todo el contenido, a mano"], ["assignment_turned_in", "Entregas y devoluciones claras"], ["forum", "Un lugar para tus consultas"]].map(([icon, label]) => <div key={icon} className="flex items-center gap-3 text-sm text-[var(--color-on-surface-variant)]"><span className="material-symbols-outlined flex size-9 items-center justify-center rounded-lg bg-[var(--color-surface-container)] text-lg text-[var(--color-primary)]" aria-hidden="true">{icon}</span>{label}</div>)}
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">Aprender, compartir y seguir avanzando.</p>
        </section>

        <section className="flex min-w-0 flex-col justify-center px-5 py-8 sm:px-10 sm:py-12 lg:px-12" aria-labelledby="login-title">
          <div className="mb-8 flex items-center gap-3 lg:hidden"><Image src="/epixum-logo.png" alt="" width={36} height={36} className="size-9 shrink-0 object-contain" /><span className="font-headline text-xl font-bold">epixum<span className="text-[var(--color-primary)]">.</span></span></div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">Bienvenido a Epixum</p>
          <h2 id="login-title" className="font-headline text-3xl font-bold tracking-tight">Ingresá a tu campus</h2>
          <p className="mb-7 mt-3 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">Usá la cuenta asociada a tus cursos para continuar.</p>

          {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]"><span className="material-symbols-outlined text-xl" aria-hidden="true">error</span><span>{error}</span></div>}
          <Button onClick={handleGoogleLogin} isPending={isLoading} pendingLabel="Conectando con Google…" size="lg" className="w-full" leadingIcon={<svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}>Continuar con Google</Button>
          <p className="mb-7 mt-3 text-center text-xs text-[var(--color-text-muted)]">El acceso a cada curso depende de tu matrícula o invitación.</p>
          <NonGmailAccountGuidance />
        </section>
      </div>
    </main>
  );
}
