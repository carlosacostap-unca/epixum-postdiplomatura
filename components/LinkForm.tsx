"use client";

import { createLink, updateLink, getResourceUploadUrl } from "@/lib/actions";
import { getErrorMessage } from "@/lib/errors";
import { Link as LinkType } from "@/types";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Button } from "@/components/ui";
import { PublicationField } from '@/components/course/PublicationField';

interface LinkFormProps {
  link?: LinkType;
  classId?: string;
  assignmentId?: string;
  contentId?: string;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function LinkForm({ link, classId, assignmentId, contentId, onClose, isEmbedded = false }: LinkFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resourceType, setResourceType] = useState<'link' | 'file'>(link?.type || 'link');
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
        if (!selectedFile && !link) {
            throw new Error("Debes seleccionar un archivo");
        }
        
        if (selectedFile) {
            // Get presigned URL
            const uploadAuth = await getResourceUploadUrl(selectedFile.name, selectedFile.type, { classId, assignmentId, contentId });
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
        } else if (link) {
            // Keep existing URL if editing and no new file selected
            url = link.url;
        }
      }

      // Prepare final form data
      const finalFormData = new FormData();
      finalFormData.append('title', title);
      finalFormData.append('url', url);
      finalFormData.append('type', resourceType);
      if (formData.has('publicationStatus')) finalFormData.set('publicationStatus', formData.get('publicationStatus')!);
      
      if (classId) finalFormData.append("classId", classId);
      if (assignmentId) finalFormData.append("assignmentId", assignmentId);
      if (contentId) finalFormData.append("contentId", contentId);

      let result;
      if (link) {
        result = await updateLink(link.id, finalFormData);
      } else {
        result = await createLink(finalFormData);
      }

      if (result.success) {
        if (onClose) onClose();
        router.refresh();
        // Don't set loading to false on success to prevent button flickering before redirect
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

  const containerClasses = isEmbedded 
    ? "w-full"
    : "bg-[var(--color-surface-container-low)] p-6 rounded-lg shadow-xl border border-[var(--color-outline-variant)] max-w-md w-full max-h-[90dvh] overflow-y-auto";

  return (
    <div className={containerClasses}>
      <h2 className="text-xl font-bold mb-4 text-[var(--color-on-surface)]">
        {link ? "Editar Recurso" : "Nuevo Recurso"}
      </h2>
      
      {error && (
        <div role="alert" className="mb-4 rounded-xl bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">
            Tipo de Recurso
          </label>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-surface-container)] p-3">
              <input
                type="radio"
                name="resourceType"
                value="link"
                checked={resourceType === 'link'}
                onChange={() => setResourceType('link')}
                className="size-4 shrink-0"
              />
              <span className="text-sm font-medium">Enlace</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-[var(--color-surface-container)] p-3">
              <input
                type="radio"
                name="resourceType"
                value="file"
                checked={resourceType === 'file'}
                onChange={() => setResourceType('file')}
                className="size-4 shrink-0"
              />
              <span className="text-sm font-medium">Archivo</span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">
            Título
          </label>
          <input
            type="text"
            name="title"
            id="title"
            defaultValue={link?.title}
            required
            placeholder={resourceType === 'link' ? "Ej: Documentación oficial" : "Ej: Guía de estudio PDF"}
            className="w-full px-3 py-2 border border-[var(--color-outline)] rounded-md focus:ring-2 focus:ring-[var(--color-focus)] bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)]"
          />
        </div>

        {resourceType === 'link' ? (
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">
              URL
            </label>
            <input
              type="url"
              name="url"
              id="url"
              defaultValue={link?.url}
              required
              placeholder="https://..."
              className="w-full px-3 py-2 border border-[var(--color-outline)] rounded-md focus:ring-2 focus:ring-[var(--color-focus)] bg-[var(--color-surface-container-lowest)] text-[var(--color-on-surface)]"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-[var(--color-on-surface-variant)] mb-1">
              Archivo
            </label>
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="file"
                id="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                required={!link} // Required only if creating new
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-[var(--color-surface-container-highest)] hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface)] rounded-md transition-colors text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Seleccionar archivo
              </button>
              <span className="min-w-0 max-w-full truncate text-sm text-[var(--color-on-surface-variant)]">
                {selectedFile ? selectedFile.name : "Ningún archivo seleccionado"}
              </span>
            </div>
            {link && link.type === 'file' && !selectedFile && (
              <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">
                Archivo actual: <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">{link.url.split('/').pop()}</a>
              </p>
            )}
          </div>
        )}

        {(classId || assignmentId || link?.class || link?.assignment) && <PublicationField existing={Boolean(link)} status={link?.publicationStatus} />}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {onClose && <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>}
          <Button type="submit" isPending={loading} pendingLabel={resourceType === "file" ? "Subiendo…" : "Guardando…"}>{link ? "Actualizar recurso" : "Crear recurso"}</Button>
        </div>
      </form>
    </div>
  );
}
