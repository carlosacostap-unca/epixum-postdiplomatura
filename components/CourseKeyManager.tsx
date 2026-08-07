"use client";

import { FormEvent, useState, useTransition } from "react";
import { updateCourseEnrollmentKey } from "@/lib/actions-course-enrollment";
import { updateCourseInvitationPassword } from "@/lib/actions-course-enrollment";
import type { CourseEnrollmentMode } from "@/types";

export default function CourseKeyManager({ courseId, enrollmentMode = "clave" }: { courseId: string; enrollmentMode?: CourseEnrollmentMode }) {
  const [key, setKey] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    startTransition(async () => {
      try {
        const result = enrollmentMode === "clave"
          ? await updateCourseEnrollmentKey(courseId, key)
          : await updateCourseInvitationPassword(courseId, key);
        if (!result.success) {
          setError(result.error || "No pudimos actualizar la clave.");
          return;
        }

        setMessage(result.message || "Clave actualizada.");
        setKey("");
      } catch {
        setError("No pudimos conectar con el servidor. Intentá nuevamente.");
      }
    });
  };

  return (
    <section className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-6 border border-[var(--color-outline-variant)]">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-11 h-11 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">key</span>
        </div>
        <div>
          <h2 className="text-xl font-headline font-bold text-[var(--color-on-surface)]">{enrollmentMode === "clave" ? "Clave de matriculación" : "Contraseña compartida"}</h2>
          <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
            {enrollmentMode === "clave" ? "Define una nueva clave. La anterior dejará de funcionar inmediatamente." : "Define la contraseña que usarán únicamente los emails invitados. La anterior dejará de funcionar inmediatamente."}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label htmlFor={`course-key-${courseId}`} className="sr-only">{enrollmentMode === "clave" ? "Nueva clave del curso" : "Nueva contraseña compartida"}</label>
        <input
          id={`course-key-${courseId}`}
          type={enrollmentMode === "clave" ? "text" : "password"}
          value={key}
          onChange={(event) => setKey(event.target.value)}
          minLength={enrollmentMode === "clave" ? 6 : 8}
          maxLength={64}
          required
          autoComplete={enrollmentMode === "clave" ? "off" : "new-password"}
          placeholder={enrollmentMode === "clave" ? "Nueva clave" : "Nueva contraseña"}
          className="w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-highest)] px-4 py-3 text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
        />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        {message && <p role="status" className="text-sm text-[var(--color-primary)]">{message}</p>}
        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-[var(--color-primary)] px-5 py-3 text-black font-bold disabled:opacity-50"
        >
          {isPending ? "Actualizando..." : enrollmentMode === "clave" ? "Guardar nueva clave" : "Guardar nueva contraseña"}
        </button>
      </form>
    </section>
  );
}
