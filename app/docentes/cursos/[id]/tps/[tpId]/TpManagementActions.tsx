"use client";

import RichTextEditor from "@/components/RichTextEditor";
import { deleteAssignment, updateAssignment } from "@/lib/actions";
import { Assignment } from "@/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface TpManagementActionsProps {
  assignment: Assignment;
  courseId: string;
}

function getLocalDateTime(isoDate?: string) {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

export default function TpManagementActions({ assignment, courseId }: TpManagementActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(assignment.description || "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSaving(true);
    setError(null);

    try {
      formData.set("description", description);
      formData.set("courseId", courseId);

      const dueDate = formData.get("dueDate") as string;
      if (dueDate) {
        formData.set("dueDate", new Date(dueDate).toISOString());
      }

      const result = await updateAssignment(assignment.id, formData);
      if (!result.success) {
        setError(result.error || "No se pudo guardar el TP.");
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Ocurrio un error inesperado al guardar el TP.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Vas a eliminar este TP del curso. Los estudiantes ya no podran verlo. Esta accion no se puede deshacer."
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteAssignment(assignment.id, courseId);
      if (!result.success) {
        setError(result.error || "No se pudo eliminar el TP.");
        return;
      }

      router.replace(`/docentes/cursos/${courseId}`);
      router.refresh();
    } catch {
      setError("Ocurrio un error inesperado al eliminar el TP.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center gap-2 px-5 py-3 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] rounded-full hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)] transition-colors font-bold text-sm border border-[var(--color-outline-variant)]"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
          <span>Editar TP</span>
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-2 px-5 py-3 bg-red-500/10 text-red-300 rounded-full hover:bg-red-500/20 transition-colors font-bold text-sm border border-red-500/20 disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">
            {isDeleting ? "refresh" : "delete"}
          </span>
          <span>{isDeleting ? "Eliminando..." : "Eliminar TP"}</span>
        </button>
      </div>

      {error && !isEditing && (
        <div className="mt-4 max-w-2xl rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-[2rem] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-6 md:p-8 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-on-surface-variant)]">
                  Editar Trabajo Practico
                </p>
                <h2 className="mt-2 text-2xl font-headline font-bold text-[var(--color-on-surface)]">
                  {assignment.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full p-2 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-highest)] hover:text-[var(--color-on-surface)] transition-colors"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form action={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="tp-title" className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Titulo *
                </label>
                <input
                  id="tp-title"
                  name="title"
                  required
                  defaultValue={assignment.title}
                  className="w-full rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-5 py-4 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Enunciado
                </label>
                <RichTextEditor content={description} onChange={setDescription} />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="tp-due-date" className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
                  Fecha limite de entrega
                </label>
                <input
                  id="tp-due-date"
                  name="dueDate"
                  type="datetime-local"
                  defaultValue={getLocalDateTime(assignment.dueDate)}
                  className="w-full rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-5 py-4 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>

              <input type="hidden" name="systemPrompt" value={assignment.systemPrompt || ""} />

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-highest)] px-6 py-3 text-sm font-bold text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] px-6 py-3 text-sm font-bold text-[#000000] hover:opacity-90 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isSaving ? "refresh" : "save"}
                  </span>
                  <span>{isSaving ? "Guardando..." : "Guardar cambios"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
