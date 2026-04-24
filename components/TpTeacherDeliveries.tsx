"use client";

import { Delivery, parseDeliveryFiles } from "@/types";
import { useState } from "react";
import { updateDeliveryEvaluation, getDeliveryFileDownloadUrl } from "@/lib/actions";
import { useRouter } from "next/navigation";
import FormattedDate from "./FormattedDate";

interface TpTeacherDeliveriesProps {
  deliveries: Delivery[];
  courseId: string;
  assignmentId: string;
}

export default function TpTeacherDeliveries({ deliveries, courseId, assignmentId }: TpTeacherDeliveriesProps) {
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const router = useRouter();

  const handleDownloadFile = async (url: string, name: string) => {
    setDownloadingFile(url);
    try {
      const result = await getDeliveryFileDownloadUrl(url);
      if (result.success && result.url) {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = name;
        a.target = '_blank';
        a.click();
      } else {
        alert(result.error || "No se pudo descargar el archivo");
      }
    } catch {
      alert("Error al descargar el archivo");
    } finally {
      setDownloadingFile(null);
    }
  };

  if (deliveries.length === 0) {
    return (
      <div className="bg-[var(--color-surface-container-low)] rounded-[2rem] p-12 text-center flex flex-col items-center justify-center border border-[var(--color-outline-variant)]">
        <span className="material-symbols-outlined text-5xl text-[var(--color-on-surface-variant)] mb-4">inbox</span>
        <p className="text-[var(--color-on-surface-variant)] text-lg">Ningún estudiante ha entregado aún.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {deliveries.map((delivery) => {
        const student = delivery.expand?.student;
        const files = parseDeliveryFiles(delivery.repositoryUrl);
        const isExpanded = expandedDelivery === delivery.id;
        const hasFeedback = !!delivery.feedback;

        return (
          <div
            key={delivery.id}
            className="bg-[var(--color-surface-container-low)] rounded-[2rem] border border-[var(--color-outline-variant)] overflow-hidden"
          >
            {/* Header */}
            <div
              className="p-6 flex items-center justify-between gap-4 cursor-pointer hover:bg-[var(--color-surface-container)] transition-colors"
              onClick={() => setExpandedDelivery(isExpanded ? null : delivery.id)}
            >
              <div className="flex items-center gap-4">
                <img
                  src={
                    student?.avatar
                      ? `${process.env.NEXT_PUBLIC_POCKETBASE_URL}/api/files/_pb_users_auth_/${student.id}/${student.avatar}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(student?.name || "U")}&background=3fff8b&color=0e0e0e`
                  }
                  alt={student?.name || "Estudiante"}
                  className="w-10 h-10 rounded-full border border-[var(--color-outline-variant)] object-cover shrink-0"
                />
                <div>
                  <p className="font-bold text-[var(--color-on-surface)]">
                    {student?.name || "Estudiante"}{student?.lastName ? ` ${student.lastName}` : ""}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap mt-1">
                    <span className="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">attach_file</span>
                      {files.length} archivo{files.length !== 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                      <FormattedDate date={delivery.created} />
                    </span>
                    {delivery.verdict && (
                      <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        delivery.verdict === 'Aprobado'
                          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'bg-[#FFB4A4]/10 text-[#FFB4A4]'
                      }`}>
                        {delivery.verdict}
                      </span>
                    )}
                    {hasFeedback && !delivery.verdict && (
                      <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-500/10 text-blue-400">
                        Con retroalimentación
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className={`material-symbols-outlined text-[var(--color-on-surface-variant)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-[var(--color-outline-variant)] p-6 flex flex-col gap-6">
                {/* Files */}
                {files.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)] mb-3">
                      Archivos entregados
                    </h4>
                    <div className="flex flex-col gap-2">
                      {files.map((file, i) => (
                        <button
                          key={i}
                          onClick={() => handleDownloadFile(file.url, file.name)}
                          disabled={downloadingFile === file.url}
                          className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-container-highest)] hover:bg-[var(--color-surface-container-high)] transition-colors text-left disabled:opacity-50 w-full"
                        >
                          <span className="material-symbols-outlined text-[var(--color-primary)] text-[20px]">
                            {downloadingFile === file.url ? 'hourglass_empty' : 'download'}
                          </span>
                          <span className="text-sm text-[var(--color-on-surface)] truncate flex-1">{file.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback Form */}
                <FeedbackForm
                  delivery={delivery}
                  courseId={courseId}
                  assignmentId={assignmentId}
                  onSaved={() => router.refresh()}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FeedbackForm({
  delivery,
  courseId,
  assignmentId,
  onSaved,
}: {
  delivery: Delivery;
  courseId: string;
  assignmentId: string;
  onSaved: () => void;
}) {
  const [feedback, setFeedback] = useState(delivery.feedback || "");
  const [verdict, setVerdict] = useState<'Aprobado' | 'Corregir y reenviar' | ''>(delivery.verdict || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = async (publish: boolean) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const result = await updateDeliveryEvaluation(
        delivery.id,
        delivery.grade || 0,
        feedback,
        verdict || undefined,
        publish ? 'published' : 'draft'
      );
      if (result.success) {
        setSaved(true);
        onSaved();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(result.error || "Error al guardar");
      }
    } catch {
      setError("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
        Retroalimentación
      </h4>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <textarea
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Escribe tu retroalimentación para el estudiante..."
        rows={4}
        className="w-full px-5 py-4 rounded-2xl bg-[var(--color-surface-container-highest)] border border-[var(--color-outline-variant)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)]/50 focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none text-sm"
      />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-on-surface-variant)]">
          Veredicto
        </label>
        <div className="flex gap-3 flex-wrap">
          {(['Aprobado', 'Corregir y reenviar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVerdict(verdict === v ? '' : v)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${
                verdict === v
                  ? v === 'Aprobado'
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/30'
                    : 'bg-[#FFB4A4]/20 text-[#FFB4A4] border-[#FFB4A4]/30'
                  : 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={loading}
          className="px-6 py-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-container)] text-[#000000] font-bold rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 text-sm flex items-center gap-2"
        >
          {loading ? (
            <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">send</span>
          )}
          {loading ? "Guardando..." : "Publicar retroalimentación"}
        </button>
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={loading}
          className="px-6 py-3 bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] font-bold rounded-full hover:bg-[var(--color-surface-container-high)] transition-colors disabled:opacity-50 text-sm border border-[var(--color-outline-variant)] flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">draft</span>
          Guardar borrador
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-[var(--color-primary)] text-sm font-medium">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Guardado
          </span>
        )}
      </div>

      {delivery.status === 'published' && (
        <p className="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">visibility</span>
          La retroalimentación ya fue publicada y es visible para el estudiante.
        </p>
      )}
      {delivery.status === 'draft' && (
        <p className="text-xs text-[var(--color-on-surface-variant)] flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">visibility_off</span>
          Retroalimentación guardada como borrador. El estudiante no puede verla aún.
        </p>
      )}
    </div>
  );
}
