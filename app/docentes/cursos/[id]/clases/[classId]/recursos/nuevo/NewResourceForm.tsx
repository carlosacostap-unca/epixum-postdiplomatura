"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createLink, getResourceUploadUrl } from "@/lib/actions";
import { getErrorMessage } from "@/lib/errors";

interface NewResourceFormProps {
  courseId: string;
  classId: string;
}

export default function NewResourceForm({ courseId, classId }: NewResourceFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resourceType, setResourceType] = useState<'link' | 'file'>('link');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    
    try {
      const title = formData.get('title') as string;
      let url = formData.get('url') as string;

      if (resourceType === 'file') {
        if (!selectedFile) {
            throw new Error("Debes seleccionar un archivo");
        }
        
        // Get presigned URL
        const uploadAuth = await getResourceUploadUrl(selectedFile.name, selectedFile.type);
        if (!uploadAuth.success || !uploadAuth.url) {
            throw new Error(uploadAuth.error || "Error al obtener URL de subida");
        }

        // Upload file
        const uploadRes = await fetch(uploadAuth.url, {
            method: "PUT",
            body: selectedFile,
            headers: {
                "Content-Type": selectedFile.type
            }
        });

        if (!uploadRes.ok) {
            throw new Error("Error al subir el archivo");
        }

        // Clean URL
        url = uploadAuth.url.split('?')[0];
      }

      // Prepare final form data
      const finalFormData = new FormData();
      finalFormData.append('title', title);
      finalFormData.append('url', url);
      finalFormData.append('type', resourceType);
      finalFormData.append("classId", classId);

      const result = await createLink(finalFormData);

      if (result.success) {
        router.push(`/docentes/cursos/${courseId}/clases/${classId}`);
        router.refresh();
      } else {
        setError(result.error || "Ocurrió un error");
        setLoading(false);
      }
    } catch (e: unknown) {
      console.error(e);
      setError(getErrorMessage(e, "Ocurrió un error inesperado"));
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-8 w-full max-w-2xl">
      {error && (
        <div className="bg-[var(--color-error)]/10 text-[var(--color-error)] px-6 py-4 rounded-2xl text-sm font-medium border border-[var(--color-error)]/20">
          {error}
        </div>
      )}

      {/* Resource Type Selection */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Tipo de Recurso
        </label>
        <div className="flex gap-4">
          <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
            resourceType === 'link' 
              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]' 
              : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
          }`}>
            <input
              type="radio"
              name="resourceType"
              value="link"
              checked={resourceType === 'link'}
              onChange={() => setResourceType('link')}
              className="hidden"
            />
            <span className="material-symbols-outlined">link</span>
            <span className="font-bold">Enlace Web</span>
          </label>
          <label className={`flex-1 flex items-center justify-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
            resourceType === 'file' 
              ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]' 
              : 'bg-[var(--color-surface-container)] border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]'
          }`}>
            <input
              type="radio"
              name="resourceType"
              value="file"
              checked={resourceType === 'file'}
              onChange={() => setResourceType('file')}
              className="hidden"
            />
            <span className="material-symbols-outlined">upload_file</span>
            <span className="font-bold">Subir Archivo</span>
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="title" className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Título del recurso
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          placeholder={resourceType === 'link' ? "Ej: Documentación oficial de React" : "Ej: Presentación de la clase (PDF)"}
          className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl px-6 py-4 text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-on-surface-variant)]/50"
        />
      </div>

      {resourceType === 'link' ? (
        <div className="flex flex-col gap-3">
          <label htmlFor="url" className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            URL del enlace
          </label>
          <input
            type="url"
            id="url"
            name="url"
            required
            placeholder="https://..."
            className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-2xl px-6 py-4 text-[var(--color-on-surface)] focus:outline-none focus:border-[var(--color-primary)] transition-colors placeholder:text-[var(--color-on-surface-variant)]/50"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="text-sm font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
            Archivo
          </label>
          <input
            type="file"
            id="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            required
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 p-8 border-2 border-dashed border-[var(--color-outline-variant)] rounded-2xl bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] hover:border-[var(--color-primary)] transition-all group text-[var(--color-on-surface-variant)]"
          >
            <span className="material-symbols-outlined text-3xl group-hover:text-[var(--color-primary)] transition-colors">
              {selectedFile ? 'task' : 'cloud_upload'}
            </span>
            <span className="font-medium">
              {selectedFile ? selectedFile.name : 'Haz clic para seleccionar un archivo'}
            </span>
          </button>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-4 mt-8 pt-8 border-t border-[var(--color-outline-variant)]">
        <Link
          href={`/docentes/cursos/${courseId}/clases/${classId}`}
          className="w-full sm:w-auto flex justify-center px-6 py-3 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] font-bold text-sm transition-colors"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-8 py-3 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full hover:bg-[var(--color-primary)]/90 transition-colors font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_var(--color-primary)]/30"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Añadir Recurso</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
