"use client";

import { createAssignmentForCourse } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";

export default function NuevoTpForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      formData.set("description", description);
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
    <form action={handleSubmit} className="max-w-2xl flex flex-col gap-8">
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Título *
        </label>
        <input
          id="title"
          name="title"
          required
          placeholder="Ej: Trabajo Práctico N°1"
          className="w-full px-5 py-4 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/50 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Enunciado
        </label>
        <div className="rounded-2xl overflow-hidden border border-[var(--color-outline-variant)]">
          <RichTextEditor content={description} onChange={setDescription} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="dueDate" className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Fecha límite de entrega
        </label>
        <input
          id="dueDate"
          name="dueDate"
          type="datetime-local"
          className="w-full px-5 py-4 rounded-2xl bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-4 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] text-[#000000] font-bold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
          ) : (
            <span className="material-symbols-outlined text-[20px]">save</span>
          )}
          {loading ? "Guardando..." : "Crear Trabajo Práctico"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-8 py-4 bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] font-bold rounded-full hover:bg-[var(--color-surface-container)] transition-colors border border-[var(--color-outline-variant)]"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
