"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClassForCourse } from "@/lib/actions";
import type { CourseWeek } from "@/types";

export default function NewClassForm({ courseId, weeks, initialWeekId }: { courseId: string; weeks: CourseWeek[]; initialWeekId?: string }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [week, setWeek] = useState(initialWeekId && weeks.some((item) => item.id === initialWeekId) ? initialWeekId : "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("week", week);
    
    // Si hay fecha, la convertimos a UTC usando la zona horaria del navegador
    if (date) {
      const dateTimeStr = time ? `${date}T${time}` : `${date}T00:00:00`;
      const localDate = new Date(dateTimeStr);
      formData.append("date", localDate.toISOString());
    }

    try {
      const result = await createClassForCourse(courseId, formData);
      if (result.success) {
        router.push(`/docentes/cursos/${courseId}`);
      } else {
        setError(result.error || "Error al crear la clase");
      }
    } catch {
      setError("No pudimos conectar con el servidor. Intentá nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full max-w-3xl">
      {error && (
        <div className="p-6 bg-[var(--color-error)]/10 border border-[var(--color-error)]/30 rounded-2xl text-[var(--color-error)] text-sm flex items-center gap-3">
          <span className="material-symbols-outlined">error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-6 md:p-10 border border-[var(--color-outline-variant)] shadow-[0_0_40px_rgba(0,0,0,0.2)] flex flex-col gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)]/5 blur-[60px] -z-10 rounded-full pointer-events-none"></div>

        <div>
          <label htmlFor="title" className="block text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-on-surface-variant)] mb-3">
            Título de la clase
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/30 rounded-[1.5rem] px-6 py-4 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none"
            placeholder="Ej: Introducción a React"
          />
        </div>

        {weeks.length > 0 ? <div>
          <label htmlFor="week" className="block text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-on-surface-variant)] mb-3">Semana</label>
          <select id="week" value={week} onChange={(event) => setWeek(event.target.value)} className="w-full bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/30 rounded-[1.5rem] px-6 py-4 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none">
            <option value="">Sin semana</option>
            {weeks.map((item) => <option key={item.id} value={item.id}>Semana {item.number}: {item.title}</option>)}
          </select>
          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">El contenido sin semana no se muestra a los estudiantes.</p>
        </div> : null}

        <div>
          <label htmlFor="description" className="block text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-on-surface-variant)] mb-3">
            Descripción
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/30 rounded-[1.5rem] px-6 py-4 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none resize-none"
            placeholder="Breve resumen de los temas a tratar..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label htmlFor="date" className="block text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-on-surface-variant)] mb-3">
              Fecha
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/30 rounded-[1.5rem] px-6 py-4 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none [color-scheme:dark]"
            />
          </div>

          <div>
            <label htmlFor="time" className="block text-[11px] font-bold tracking-[0.2em] uppercase text-[var(--color-on-surface-variant)] mb-3">
              Hora
            </label>
            <input
              type="time"
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)]/30 rounded-[1.5rem] px-6 py-4 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all outline-none [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 sm:gap-6 mt-4 w-full">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full sm:w-auto px-8 py-4 bg-transparent text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)] rounded-full font-bold text-sm transition-colors border border-transparent hover:border-[var(--color-outline-variant)] flex justify-center items-center"
          disabled={isLoading}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] text-[#000000] rounded-full hover:opacity-90 transition-opacity font-bold text-sm shadow-[0_0_20px_rgba(63,255,139,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Creando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Crear Clase
            </>
          )}
        </button>
      </div>
    </form>
  );
}
