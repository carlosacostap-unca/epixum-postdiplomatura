"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FormattedDate from "./FormattedDate";
import { Badge, Button, Card, CardContent, EmptyState, IconButton, useToast } from "@/components/ui";
import { createDeliveryWithFiles, getStudentDeliveryFileDownloadUrl, getUploadUrl, updateDeliveryWithFiles } from "@/lib/actions";
import { getDeadlineState } from "@/lib/student-learning";
import { Delivery, parseDeliveryFiles } from "@/types";

export default function TpStudentDelivery({ assignmentId, courseId, delivery, dueDate }: { assignmentId: string; courseId: string; delivery: Delivery | null; dueDate?: string }) {
  const deadline = getDeadlineState(dueDate);
  const isPastDue = deadline === "overdue";
  const [isEditing, setIsEditing] = useState(!delivery && !isPastDue);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { notify } = useToast();
  const existingFiles = delivery ? parseDeliveryFiles(delivery.repositoryUrl) : [];

  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const incoming = Array.from(event.target.files || []);
    setSelectedFiles((current) => {
      const names = new Set(current.map((file) => file.name));
      return [...current, ...incoming.filter((file) => !names.has(file.name))];
    });
    event.target.value = "";
  };

  const submit = async () => {
    if (isPastDue) { setError("El plazo de entrega finalizó y ya no admite cambios."); return; }
    if (selectedFiles.length === 0) { setError("Seleccioná al menos un archivo."); fileInputRef.current?.focus(); return; }
    setLoading(true);
    setError(null);
    try {
      const uploaded: { name: string; url: string }[] = [];
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const file = selectedFiles[index];
        setProgress({ current: index, total: selectedFiles.length, label: `Subiendo ${file.name}` });
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const authorization = await getUploadUrl(`${Date.now()}_${safeName}`, file.type);
        if (!authorization.success || !authorization.url) throw new Error(`No se pudo preparar la subida de ${file.name}.`);
        const response = await fetch(authorization.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
        if (!response.ok) throw new Error(`No se pudo subir ${file.name}.`);
        uploaded.push({ name: file.name, url: authorization.url.split("?")[0] });
        setProgress({ current: index + 1, total: selectedFiles.length, label: `${file.name} subido` });
      }
      setProgress({ current: selectedFiles.length, total: selectedFiles.length, label: "Guardando la entrega" });
      const result = delivery
        ? await updateDeliveryWithFiles(delivery.id, courseId, assignmentId, uploaded)
        : await createDeliveryWithFiles(assignmentId, courseId, uploaded);
      if (!result.success) { setError(result.error || "No se pudo guardar la entrega."); return; }
      setIsEditing(false);
      setSelectedFiles([]);
      notify({ title: delivery ? "Entrega actualizada" : "Entrega enviada", description: "Los archivos quedaron guardados correctamente.", tone: "success" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const download = async (index: number, name: string) => {
    if (!delivery) return;
    setDownloadingIndex(index);
    const result = await getStudentDeliveryFileDownloadUrl(delivery.id, index);
    setDownloadingIndex(null);
    if (!result.success || !result.url) { notify({ title: "No se pudo descargar", description: result.error, tone: "error" }); return; }
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = name;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  };

  return <div className="space-y-6">
    {delivery && !isEditing && <Card><CardContent className="space-y-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><Badge tone="success">Entrega enviada</Badge>{delivery.status === "published" && <Badge tone="info">Evaluada</Badge>}</div><p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">Enviada <FormattedDate date={delivery.created} showTime /></p></div>{!isPastDue && <Button variant="secondary" leadingIcon={<span className="material-symbols-outlined text-lg">edit</span>} onClick={() => setIsEditing(true)}>Actualizar entrega</Button>}</div><div className="space-y-2"><h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Archivos entregados</h3>{existingFiles.map((file, index) => <Button key={`${file.url}-${index}`} variant="secondary" isPending={downloadingIndex === index} pendingLabel="Preparando…" leadingIcon={<span className="material-symbols-outlined text-lg">download</span>} onClick={() => download(index, file.name)} className="w-full justify-start"><span className="truncate">{file.name}</span></Button>)}</div>{isPastDue && <p className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">lock</span>El plazo terminó. Tu entrega se conserva, pero ya no puede modificarse.</p>}</CardContent></Card>}

    {delivery?.status === "published" && <Card><CardContent className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-headline text-xl font-bold">Devolución del docente</h3>{delivery.verdict && <Badge tone={delivery.verdict === "Aprobado" ? "success" : "warning"}>{delivery.verdict}</Badge>}</div>{delivery.grade !== undefined && <p className="font-headline text-3xl font-bold text-[var(--color-primary)]">Nota: {delivery.grade}</p>}<p className="whitespace-pre-wrap leading-relaxed text-[var(--color-on-surface-variant)]">{delivery.feedback || "La evaluación fue publicada sin comentario adicional."}</p></CardContent></Card>}

    {isEditing && !isPastDue && <Card><CardContent className="space-y-5"><div><h3 className="font-headline text-xl font-bold">{delivery ? "Actualizar entrega" : "Subir entrega"}</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Los archivos seleccionados reemplazarán la entrega actual.</p></div>{error && <p role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">{error}</p>}<input ref={fileInputRef} id={`tp-files-${assignmentId}`} type="file" multiple onChange={addFiles} className="sr-only" /><label htmlFor={`tp-files-${assignmentId}`} className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--epixum-radius-lg)] border-2 border-dashed border-[var(--color-outline)] p-6 text-center hover:border-[var(--color-primary)]"><span className="material-symbols-outlined text-4xl text-[var(--color-primary)]" aria-hidden="true">upload_file</span><span className="font-bold">Seleccionar archivos</span><span className="text-sm text-[var(--color-on-surface-variant)]">Podés volver a elegir para agregar más.</span></label>{selectedFiles.length > 0 && <div className="space-y-2"><h4 className="text-sm font-bold">Archivos seleccionados ({selectedFiles.length})</h4>{selectedFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-highest)] p-3"><span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">description</span><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span><span className="text-xs text-[var(--color-on-surface-variant)]">{Math.ceil(file.size / 1024)} KB</span><IconButton label={`Quitar ${file.name}`} icon={<span className="material-symbols-outlined">close</span>} variant="ghost" onClick={() => setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></div>)}</div>}{progress && <div role="status" className="space-y-2"><div className="flex justify-between gap-4 text-sm"><span>{progress.label}</span><span>{Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%</span></div><progress className="h-2 w-full accent-[var(--color-primary)]" max={progress.total} value={progress.current} /></div>}<div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{delivery && <Button variant="ghost" disabled={loading} onClick={() => { setIsEditing(false); setSelectedFiles([]); setError(null); }}>Cancelar</Button>}<Button isPending={loading} pendingLabel="Enviando…" disabled={selectedFiles.length === 0} leadingIcon={<span className="material-symbols-outlined text-lg">send</span>} onClick={submit}>Enviar entrega</Button></div></CardContent></Card>}

    {!delivery && isPastDue && <EmptyState icon="lock" title="Entrega cerrada" description="La fecha límite ya pasó y no registraste una entrega. El servidor también bloqueará cualquier intento fuera de término." />}
  </div>;
}
