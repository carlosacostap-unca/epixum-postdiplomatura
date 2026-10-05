"use client";

import { createAssignmentForCourse } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { Button } from "@/components/ui";
import type { CourseWeek } from "@/types";
import { PublicationField } from '@/components/course/PublicationField';

export default function NuevoTpForm({ courseId, weeks, initialWeekId }: { courseId: string; weeks: CourseWeek[]; initialWeekId?: string }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [week, setWeek] = useState(initialWeekId && weeks.some((item) => item.id === initialWeekId) ? initialWeekId : "");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      formData.set("description", description);
      formData.set("week", week);
      const dueDateStr = formData.get("dueDate") as string;
      if (dueDateStr) {
        formData.set("dueDate", new Date(dueDateStr).toISOString());
      }
      const result = await createAssignmentForCourse(courseId, formData);
      if (result.success) {
        router.push(`/docentes/cursos/${courseId}/tps/${result.assignmentId}`);
      } else {
        setError(result.error || "Ocurrió un error");
      }
    } catch {
      setError("Ocurrió un error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex w-full max-w-3xl flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-xl bg-[var(--color-error)]/10 p-4 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-semibold text-[var(--color-on-surface)]">
          Título *
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="Ej: Trabajo Práctico N°1"
          className="w-full px-4 py-3 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-low)] border border-[var(--color-outline)] text-[var(--color-on-surface)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      {weeks.length > 0 ? <div className="flex flex-col gap-2">
        <label htmlFor="week" className="text-sm font-semibold text-[var(--color-on-surface)]">Unidad</label>
        <select id="week" name="week" value={week} onChange={(event) => setWeek(event.target.value)} className="w-full px-4 py-3 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-low)] border border-[var(--color-outline)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors">
          <option value="">Sin unidad</option>
          {weeks.map((item) => <option key={item.id} value={item.id}>Unidad {item.number}: {item.title}</option>)}
        </select>
        <p className="text-sm text-[var(--color-on-surface-variant)]">El contenido sin unidad no se muestra a los estudiantes.</p>
      </div> : null}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold text-[var(--color-on-surface)]">
          Enunciado
        </label>
        <div className="rounded-2xl overflow-hidden border border-[var(--color-outline-variant)]">
          <RichTextEditor content={description} onChange={setDescription} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="dueDate" className="text-sm font-semibold text-[var(--color-on-surface)]">
          Fecha límite de entrega
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="datetime-local"
          className="w-full px-4 py-3 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-low)] border border-[var(--color-outline)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      <PublicationField assignment />

      <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" disabled={loading} onClick={() => router.back()}>Cancelar</Button>
        <Button type="submit" isPending={loading} pendingLabel="Guardando…" leadingIcon={<span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>}>Crear trabajo práctico</Button>
      </div>
    </form>
  );
}
