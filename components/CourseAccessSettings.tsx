"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCourseEnrollmentMode } from "@/lib/actions-course-enrollment";
import type { CourseEnrollmentMode } from "@/types";
import { Button, useToast } from "@/components/ui";

export default function CourseAccessSettings({ courseId, initialMode }: { courseId: string; initialMode: CourseEnrollmentMode }) {
  const [mode, setMode] = useState<CourseEnrollmentMode>(initialMode);
  const [isPending, startTransition] = useTransition();
  const { notify } = useToast();
  const router = useRouter();

  function save() {
    startTransition(async () => {
      const result = await updateCourseEnrollmentMode(courseId, mode);
      if (!result.success) {
        notify({ title: "No se cambió la modalidad", description: result.error, tone: "error" });
        return;
      }
      notify({ title: "Modalidad actualizada", description: "Las matrículas e invitaciones existentes se conservaron.", tone: "success" });
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="access-mode-title" className="rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-6 md:p-8">
      <h2 id="access-mode-title" className="font-headline text-2xl font-bold">Modalidad de acceso</h2>
      <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Cambiarla no elimina matrículas, invitaciones ni actividad existente.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="course-access-mode" className="mb-2 block text-sm font-bold">Cómo ingresan los alumnos</label>
          <select id="course-access-mode" value={mode} onChange={(event) => setMode(event.target.value as CourseEnrollmentMode)} disabled={isPending} className="min-h-11 w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5">
            <option value="clave">Clave compartida · matrícula inmediata</option>
            <option value="invitacion_contrasena">Email autorizado + contraseña · doble validación</option>
          </select>
        </div>
        <Button onClick={save} disabled={mode === initialMode} isPending={isPending}>Guardar modalidad</Button>
      </div>
    </section>
  );
}
