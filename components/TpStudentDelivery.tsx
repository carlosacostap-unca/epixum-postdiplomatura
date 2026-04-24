"use client";

import { useState, useRef } from "react";
import { Delivery, parseDeliveryFiles } from "@/types";
import { createDeliveryWithFiles, updateDeliveryWithFiles, getDeliveryFileDownloadUrl, getUploadUrl } from "@/lib/actions";
import { useRouter } from "next/navigation";
import FormattedDate from "./FormattedDate";

interface TpStudentDeliveryProps {
  assignmentId: string;
  courseId: string;
  delivery: Delivery | null;
  dueDate?: string;
}

export default function TpStudentDelivery({
  assignmentId,
  courseId,
  delivery,
  dueDate,
}: TpStudentDeliveryProps) {
  const [isEditing, setIsEditing] = useState(!delivery);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const isPastDue = dueDate ? new Date() > new Date(dueDate) : false;
  const existingFiles = delivery ? parseDeliveryFiles(delivery.repositoryUrl) : [];
  const hasFeedback = delivery?.status === 'published' && delivery.feedback;

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => {
        const existingNames = new Set(prev.map((f) => f.name));
        const toAdd = newFiles.filter((f) => !existingNames.has(f.name));
        return [...prev, ...toAdd];
      });
      // Limpiar el input para permitir volver a seleccionar los mismos archivos
      e.target.value = "";
    }
  };

  const handleRemoveSelected = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (isPastDue) {
      setError("El plazo de entrega ha finalizado.");
      return;
    }
    if (selectedFiles.length === 0) {
      setError("Debes seleccionar al menos un archivo.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const uploadedFiles: { name: string; url: string }[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`Subiendo archivo ${i + 1} de ${selectedFiles.length}: ${file.name}`);

        // Sanitize filename
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueName = `${Date.now()}_${safeName}`;

        const authResult = await getUploadUrl(uniqueName, file.type);
        if (!authResult.success || !authResult.url) {
          throw new Error(`No se pudo obtener URL de subida para ${file.name}`);
        }

        const uploadResponse = await fetch(authResult.url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Error al subir ${file.name}`);
        }

        uploadedFiles.push({
          name: file.name,
          url: authResult.url.split('?')[0],
        });
      }

      setUploadProgress("Guardando entrega...");

      const result = delivery
        ? await updateDeliveryWithFiles(delivery.id, courseId, assignmentId, uploadedFiles)
        : await createDeliveryWithFiles(assignmentId, courseId, uploadedFiles);

      if (result.success) {
        setIsEditing(false);
        setSelectedFiles([]);
        setUploadProgress("");
        router.refresh();
      } else {
        setError(result.error || "Error al guardar la entrega");
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado");
    } finally {
      setLoading(false);
      setUploadProgress("");
    }
  };

  const handleDownload = async (url: string, name: string) => {
    setDownloadingUrl(url);
    try {
      const result = await getDeliveryFileDownloadUrl(url);
      if (result.success && result.url) {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = name;
        a.target = '_blank';
        a.click();
      } else {
        alert(result.error || "No se pudo descargar");
      }
    } catch {
      alert("Error al descargar el archivo");
    } finally {
      setDownloadingUrl(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Existing delivery */}
      {delivery && !isEditing && (
        <div className="bg-[var(--color-surface-container-low)] rounded-[2rem] p-6 border border-[var(--color-outline-variant)] flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[var(--color-primary)] text-[22px]">check_circle</span>
              <div>
                <p className="font-bold text-[var(--color-on-surface)]">Entrega enviada</p>
                <p className="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                  <FormattedDate date={delivery.created} />
                </p>
              </div>
            </div>
            {!isPastDue && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2.5 rounded-full bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)] font-bold text-sm transition-colors border border-[var(--color-outline-variant)] flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Reenviar entrega
              </button>
            )}
          </div>

          {existingFiles.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">
                Archivos entregados
              </p>
              <div className="flex flex-col gap-2">
                {existingFiles.map((file, i) => (
                  <button
                    key={i}
                    onClick={() => handleDownload(file.url, file.name)}
                    disabled={downloadingUrl === file.url}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-container-highest)] hover:bg-[var(--color-surface-container-high)] transition-colors text-left disabled:opacity-50 w-full"
                  >
                    <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">
                      {downloadingUrl === file.url ? 'hourglass_empty' : 'download'}
                    </span>
                    <span className="text-sm text-[var(--color-on-surface)] truncate">{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback from teacher */}
      {hasFeedback && (
        <div className="bg-[var(--color-surface-container-low)] rounded-[2rem] p-6 border border-[var(--color-outline-variant)] flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-[22px]">rate_review</span>
            <h3 className="font-bold text-[var(--color-on-surface)] text-lg">Retroalimentación del docente</h3>
          </div>
          {delivery?.verdict && (
            <span className={`self-start px-4 py-1.5 rounded-full text-sm font-bold ${
              delivery.verdict === 'Aprobado'
                ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'
                : 'bg-[#FFB4A4]/15 text-[#FFB4A4]'
            }`}>
              {delivery.verdict}
            </span>
          )}
          <p className="text-[var(--color-on-surface-variant)] leading-relaxed whitespace-pre-wrap">
            {delivery?.feedback}
          </p>
        </div>
      )}

      {/* Upload form */}
      {isEditing && (
        <div className="bg-[var(--color-surface-container-low)] rounded-[2rem] p-6 border border-[var(--color-outline-variant)] flex flex-col gap-5">
          <h3 className="font-bold text-[var(--color-on-surface)] text-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-[var(--color-primary)] text-[22px]">upload_file</span>
            {delivery ? "Actualizar entrega" : "Subir entrega"}
          </h3>

          {isPastDue ? (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">lock</span>
              El plazo de entrega ha finalizado.
            </div>
          ) : (
            <>
              {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* File input */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFilesChange}
                  className="hidden"
                  id="tp-file-input"
                />
                <label
                  htmlFor="tp-file-input"
                  className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-4xl text-[var(--color-on-surface-variant)]">upload_file</span>
                  <span className="text-sm text-[var(--color-on-surface-variant)] text-center">
                    Haz clic para agregar archivos<br />
                    <span className="text-xs">Podés hacer clic varias veces para ir sumando archivos</span>
                  </span>
                </label>
              </div>

              {/* Selected files preview */}
              {selectedFiles.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-2">
                    Archivos seleccionados ({selectedFiles.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {selectedFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)]"
                      >
                        <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px] shrink-0">description</span>
                        <span className="text-sm text-[var(--color-on-surface)] flex-1 truncate">{file.name}</span>
                        <span className="text-xs text-[var(--color-on-surface-variant)] shrink-0">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelected(i)}
                          className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--color-on-surface-variant)] hover:text-red-400 transition-colors shrink-0"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress */}
              {loading && uploadProgress && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-surface-container-highest)]">
                  <span className="material-symbols-outlined animate-spin text-[var(--color-primary)] text-[20px]">refresh</span>
                  <span className="text-sm text-[var(--color-on-surface-variant)]">{uploadProgress}</span>
                </div>
              )}

              <div className="flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || selectedFiles.length === 0}
                  className="px-6 py-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] text-[#000000] font-bold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 text-sm flex items-center gap-2"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  )}
                  {loading ? "Enviando..." : "Enviar entrega"}
                </button>
                {delivery && (
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setSelectedFiles([]); setError(null); }}
                    disabled={loading}
                    className="px-6 py-3 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] font-bold rounded-full hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50 text-sm border border-[var(--color-outline-variant)]"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* No delivery yet and past due */}
      {!delivery && !isEditing && isPastDue && (
        <div className="bg-[var(--color-surface-container-low)] rounded-[2rem] p-8 text-center flex flex-col items-center justify-center border border-[var(--color-outline-variant)]">
          <span className="material-symbols-outlined text-4xl text-[var(--color-on-surface-variant)] mb-3">lock</span>
          <p className="text-[var(--color-on-surface-variant)]">El plazo de entrega ha cerrado y no realizaste ninguna entrega.</p>
        </div>
      )}
    </div>
  );
}
