"use client";

import { useState } from "react";
import { createInquiry } from "@/lib/actions-inquiries";
import { useRouter } from "next/navigation";
import { Class } from "@/types";

interface NewInquiryFormProps {
  courseId: string;
  classes: Class[];
  basePath: string;
}

export default function NewInquiryForm({ courseId, classes, basePath }: NewInquiryFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("El título y la descripción son obligatorios.");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await createInquiry({
      title,
      description,
      courseId,
      classId: classId || undefined,
    });

    setIsLoading(false);

    if (result.success) {
      router.push(basePath);
      router.refresh();
    } else {
      setError(result.error || "Ocurrió un error al crear la consulta.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">error</span>
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] ml-4">
          Título de la consulta *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Duda sobre el concepto de Reactividad"
          className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] outline-none rounded-full px-6 py-4 text-[var(--color-on-surface)] transition-colors w-full placeholder:text-[var(--color-on-surface-variant)]/50"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] ml-4">
          ¿Relacionado a una clase? (Opcional)
        </label>
        <div className="relative">
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] outline-none rounded-full px-6 py-4 text-[var(--color-on-surface)] transition-colors appearance-none cursor-pointer"
          >
            <option value="">-- Selecciona una clase --</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-on-surface-variant)]">
            expand_more
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)] ml-4">
          Descripción *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Explica tu duda o comentario con más detalle..."
          rows={6}
          className="bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] focus:border-[var(--color-primary)] outline-none rounded-[2rem] px-6 py-5 text-[var(--color-on-surface)] transition-colors w-full placeholder:text-[var(--color-on-surface-variant)]/50 resize-y"
          required
        />
      </div>

      <div className="flex items-center justify-end gap-4 mt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-8 py-4 rounded-full font-bold text-sm text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-highest)] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading || !title.trim() || !description.trim()}
          className="px-8 py-4 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full hover:bg-[var(--color-primary)]/90 transition-colors font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_var(--color-primary)]/30"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              Enviando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px]">send</span>
              Crear Consulta
            </>
          )}
        </button>
      </div>
    </form>
  );
}