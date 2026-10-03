"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import FormattedDate from "./FormattedDate";
import { Badge, Button, Card, CardContent, EmptyState, IconButton, useToast } from "@/components/ui";
import {
  createDeliveryWithFiles,
  createDeliveryWithUrl,
  getStudentDeliveryFileDownloadUrl,
  getUploadUrl,
  updateDeliveryWithFiles,
  updateDeliveryWithUrl,
} from "@/lib/actions";
import { getDeadlineState } from "@/lib/student-learning";
import { Delivery, isGithubDeliverySubmission, isValidDeliveryUrl, parseDeliverySubmission } from "@/types";
import { canStudentModifyDelivery, getStudentDeliveryState, latestPublishedEvaluation, normalizeDeliveryWorkflow } from "@/lib/delivery-workflow";
import { studentDeliveryPresentation } from "@/lib/delivery-presentation";

export default function TpStudentDelivery({ assignmentId, courseId, delivery, dueDate }: { assignmentId: string; courseId: string; delivery: Delivery | null; dueDate?: string }) {
  const deadline = getDeadlineState(dueDate);
  const isPastDue = deadline === "overdue";
  const workflow = delivery ? normalizeDeliveryWorkflow(delivery) : null;
  const studentState = delivery ? getStudentDeliveryState(delivery) : null;
  const presentation = delivery ? studentDeliveryPresentation(delivery) : null;
  const canModify = delivery ? canStudentModifyDelivery(delivery, isPastDue) : !isPastDue;
  const existingSubmission = delivery ? parseDeliverySubmission(delivery.repositoryUrl) : { type: "files" as const, files: [] };
  const [isEditing, setIsEditing] = useState(!delivery && !isPastDue);
  const [mode, setMode] = useState<"files" | "url">(existingSubmission.type);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [deliveryUrl, setDeliveryUrl] = useState(existingSubmission.type === "url" ? existingSubmission.url : "");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { notify } = useToast();

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
    if (!canModify) { setError("La entrega ya no admite cambios. Solo podés reenviar cuando el docente solicite una corrección."); return; }
    if (mode === "files" && selectedFiles.length === 0) { setError("Seleccioná al menos un archivo."); fileInputRef.current?.focus(); return; }
    if (mode === "url" && !isValidDeliveryUrl(deliveryUrl)) { setError("Ingresá una URL completa que comience con http:// o https://."); return; }
    setLoading(true);
    setError(null);
    try {
      let result: { success: boolean; error?: string; resubmitted?: boolean };
      if (mode === "url") {
        setProgress({ current: 1, total: 1, label: "Guardando el enlace" });
        result = delivery
          ? await updateDeliveryWithUrl(delivery.id, courseId, assignmentId, deliveryUrl)
          : await createDeliveryWithUrl(assignmentId, courseId, deliveryUrl);
      } else {
        const uploaded: { name: string; url: string }[] = [];
        for (let index = 0; index < selectedFiles.length; index += 1) {
          const file = selectedFiles[index];
          setProgress({ current: index, total: selectedFiles.length, label: `Subiendo ${file.name}` });
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const authorization = await getUploadUrl(`${Date.now()}_${safeName}`, file.type, assignmentId);
          if (!authorization.success || !authorization.url) throw new Error(`No se pudo preparar la subida de ${file.name}.`);
          const response = await fetch(authorization.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
          if (!response.ok) throw new Error(`No se pudo subir ${file.name}.`);
          uploaded.push({ name: file.name, url: authorization.url.split("?")[0] });
          setProgress({ current: index + 1, total: selectedFiles.length, label: `${file.name} subido` });
        }
        setProgress({ current: selectedFiles.length, total: selectedFiles.length, label: "Guardando la entrega" });
        result = delivery
          ? await updateDeliveryWithFiles(delivery.id, courseId, assignmentId, uploaded)
          : await createDeliveryWithFiles(assignmentId, courseId, uploaded);
      }
      if (!result.success) { setError(result.error || "No se pudo guardar la entrega."); return; }
      setIsEditing(false);
      setSelectedFiles([]);
      notify({ title: result.resubmitted ? "Corrección reenviada" : delivery ? "Entrega actualizada" : "Entrega enviada", description: result.resubmitted ? "Tu nueva versión quedó pendiente de revisión docente." : mode === "url" ? "El enlace quedó guardado correctamente." : "Los archivos quedaron guardados correctamente.", tone: "success" });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const download = async (index: number, name: string, version?: number) => {
    if (!delivery) return;
    const downloadId = `${version ?? workflow?.submissionVersion ?? 1}:${index}`;
    setDownloadingIndex(downloadId);
    const result = await getStudentDeliveryFileDownloadUrl(delivery.id, index, version);
    setDownloadingIndex(null);
    if (!result.success || !result.url) { notify({ title: "No se pudo descargar", description: result.error, tone: "error" }); return; }
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = name;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setMode(existingSubmission.type);
    setDeliveryUrl(existingSubmission.type === "url" ? existingSubmission.url : "");
    setSelectedFiles([]);
    setError(null);
  };

  const previousEvaluation = delivery && studentState === "resubmitted" ? latestPublishedEvaluation(delivery) : undefined;
  const history = workflow?.history || [];

  return <div className="space-y-6">
    {delivery && !isEditing && (
      <Card>
        <CardContent className="space-y-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3"><Badge tone={presentation?.tone}>{presentation?.label}</Badge><Badge tone="neutral">Versión {workflow?.submissionVersion}</Badge></div>
              <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">Enviada <FormattedDate date={workflow?.submittedAt || delivery.created} showTime /></p>
            </div>
            {canModify && <Button variant="secondary" leadingIcon={<span className="material-symbols-outlined text-lg">edit</span>} onClick={() => setIsEditing(true)}>{studentState === "correction_requested" ? "Reenviar corrección" : "Actualizar entrega"}</Button>}
          </div>
          {existingSubmission.type === "url" ? (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Enlace entregado</h3>
              <a href={existingSubmission.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 rounded-[var(--epixum-radius-pill)] bg-[var(--color-surface-container-highest)] px-5 py-2.5 text-sm font-bold hover:text-[var(--color-primary)]">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">open_in_new</span>
                <span className="truncate">{existingSubmission.url}</span>
              </a>
              {isGithubDeliverySubmission(existingSubmission) && <div className="rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-high)] p-4 text-sm">
                <p><span className="font-bold">Repositorio:</span> {existingSubmission.repositoryFullName}</p>
                <p className="mt-1"><span className="font-bold">Commit entregado:</span> <code>{existingSubmission.commitSha.slice(0, 12)}</code></p>
                <p className="mt-1 text-[var(--color-on-surface-variant)]">Capturado <FormattedDate date={existingSubmission.commitCapturedAt} showTime /></p>
              </div>}
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">Archivos entregados</h3>
              {existingSubmission.files.map((file, index) => <Button key={`${file.url}-${index}`} variant="secondary" isPending={downloadingIndex === `${workflow?.submissionVersion ?? 1}:${index}`} pendingLabel="Preparando…" leadingIcon={<span className="material-symbols-outlined text-lg">download</span>} onClick={() => download(index, file.name)} className="w-full justify-start"><span className="truncate">{file.name}</span></Button>)}
            </div>
          )}
          {isPastDue && studentState === "correction_requested" && <p className="flex items-center gap-2 text-sm text-[var(--color-warning)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">edit_note</span>El plazo original terminó, pero podés realizar el reenvío solicitado.</p>}
          {isPastDue && !canModify && <p className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">lock</span>El plazo terminó. Tu entrega se conserva y no admite cambios.</p>}
        </CardContent>
      </Card>
    )}

    {delivery?.status === "published" && <Card><CardContent className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-headline text-xl font-bold">Devolución del docente</h3>{delivery.verdict && <Badge tone={delivery.verdict === "Aprobado" ? "success" : delivery.verdict === "Desaprobado" ? "error" : "warning"}>{delivery.verdict}</Badge>}</div>{typeof delivery.grade === "number" && <p className="font-headline text-3xl font-bold text-[var(--color-primary)]">Nota: {delivery.grade}</p>}<p className="reading-content whitespace-pre-wrap text-[var(--color-on-surface-variant)]">{delivery.feedback || "La evaluación fue publicada sin comentario adicional."}</p></CardContent></Card>}

    {previousEvaluation && <Card><CardContent className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-headline text-xl font-bold">Devolución anterior</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Corresponde a la versión previa; tu reenvío todavía no fue evaluado.</p></div><Badge tone="warning">{previousEvaluation.verdict}</Badge></div>{typeof previousEvaluation.grade === "number" && <p className="font-headline text-3xl font-bold text-[var(--color-primary)]">Nota: {previousEvaluation.grade}</p>}<p className="reading-content whitespace-pre-wrap text-[var(--color-on-surface-variant)]">{previousEvaluation.feedback}</p></CardContent></Card>}

    {history.length > 0 && <Card><CardContent className="space-y-5"><div><h3 className="font-headline text-xl font-bold">Historial de intentos</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Versiones anteriores y devoluciones publicadas.</p></div><ol className="space-y-4">{[...history].reverse().map((entry) => { const submission = entry.repositoryUrl ? parseDeliverySubmission(entry.repositoryUrl) : null; return <li key={entry.version} className="rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-high)] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-bold">Versión {entry.version}</span><FormattedDate date={entry.submittedAt} showTime /></div>{entry.contentUnavailable && <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">El contenido original de esta versión histórica no estaba disponible al migrar la entrega.</p>}{submission?.type === "url" && <a href={submission.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 font-bold text-[var(--color-primary)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">open_in_new</span>Abrir enlace entregado</a>}{submission?.type === "files" && <div className="mt-3 grid gap-2 sm:grid-cols-2">{submission.files.map((file, index) => <Button key={`${entry.version}-${file.url}-${index}`} variant="secondary" isPending={downloadingIndex === `${entry.version}:${index}`} pendingLabel="Preparando…" onClick={() => download(index, file.name, entry.version)} className="justify-start"><span className="truncate">{file.name}</span></Button>)}</div>}{entry.evaluation && <div className="mt-4 border-t border-[var(--color-outline-variant)] pt-4"><div className="flex flex-wrap items-center gap-3"><Badge tone={entry.evaluation.verdict === "Aprobado" ? "success" : entry.evaluation.verdict === "Desaprobado" ? "error" : "warning"}>{entry.evaluation.verdict}</Badge>{typeof entry.evaluation.grade === "number" && <span className="font-bold">Nota: {entry.evaluation.grade}</span>}</div><p className="mt-3 whitespace-pre-wrap text-sm text-[var(--color-on-surface-variant)]">{entry.evaluation.feedback}</p></div>}</li>; })}</ol></CardContent></Card>}

    {isEditing && canModify && (
      <Card>
        <CardContent className="space-y-5">
          <div><h3 className="font-headline text-xl font-bold">{studentState === "correction_requested" ? "Reenviar corrección" : delivery ? "Actualizar entrega" : "Enviar entrega"}</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Elegí archivos o compartí un enlace. {delivery ? "Se guardará como una nueva versión de tu entrega." : "Después de enviar vas a ver la confirmación y el estado de revisión."}</p></div>
          {error && <p role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">{error}</p>}
          <fieldset className="space-y-3">
            <legend className="text-sm font-bold">Modalidad de entrega</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" aria-pressed={mode === "files"} onClick={() => { setMode("files"); setError(null); }} className={`flex min-h-16 items-center gap-3 rounded-[var(--epixum-radius-lg)] border p-4 text-left font-bold ${mode === "files" ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)]"}`}><span className="material-symbols-outlined" aria-hidden="true">upload_file</span>Archivos</button>
              <button type="button" aria-pressed={mode === "url"} onClick={() => { setMode("url"); setError(null); }} className={`flex min-h-16 items-center gap-3 rounded-[var(--epixum-radius-lg)] border p-4 text-left font-bold ${mode === "url" ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]" : "border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)]"}`}><span className="material-symbols-outlined" aria-hidden="true">link</span>URL</button>
            </div>
          </fieldset>

          {mode === "files" ? (
            <>
              <input ref={fileInputRef} id={`tp-files-${assignmentId}`} type="file" multiple onChange={addFiles} className="sr-only" />
              <label htmlFor={`tp-files-${assignmentId}`} className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--epixum-radius-lg)] border-2 border-dashed border-[var(--color-outline)] p-6 text-center hover:border-[var(--color-primary)]"><span className="material-symbols-outlined text-4xl text-[var(--color-primary)]" aria-hidden="true">upload_file</span><span className="font-bold">Seleccionar archivos</span><span className="text-sm text-[var(--color-on-surface-variant)]">Podés volver a elegir para agregar más.</span></label>
              {selectedFiles.length > 0 && <div className="space-y-2"><h4 className="text-sm font-bold">Archivos seleccionados ({selectedFiles.length})</h4>{selectedFiles.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-highest)] p-3"><span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">description</span><span className="min-w-0 flex-1 truncate text-sm">{file.name}</span><span className="text-xs text-[var(--color-on-surface-variant)]">{Math.ceil(file.size / 1024)} KB</span><IconButton label={`Quitar ${file.name}`} icon={<span className="material-symbols-outlined">close</span>} variant="ghost" onClick={() => setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></div>)}</div>}
            </>
          ) : (
            <div className="space-y-2">
              <label htmlFor={`tp-url-${assignmentId}`} className="text-sm font-bold">URL de la entrega</label>
              <input id={`tp-url-${assignmentId}`} type="url" inputMode="url" autoComplete="url" value={deliveryUrl} onChange={(event) => { setDeliveryUrl(event.target.value); setError(null); }} placeholder="https://github.com/usuario/proyecto" className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" />
              <p className="text-sm text-[var(--color-on-surface-variant)]">Asegurate de que el docente pueda abrir el enlace y tenga los permisos necesarios.</p>
            </div>
          )}

          {progress && <div role="status" className="space-y-2"><div className="flex justify-between gap-4 text-sm"><span>{progress.label}</span><span>{Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%</span></div><progress className="h-2 w-full accent-[var(--color-primary)]" max={progress.total} value={progress.current} /></div>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {delivery && <Button variant="ghost" disabled={loading} onClick={cancelEditing}>Cancelar</Button>}
            <Button isPending={loading} pendingLabel="Enviando…" disabled={mode === "files" ? selectedFiles.length === 0 : deliveryUrl.trim().length === 0} leadingIcon={<span className="material-symbols-outlined text-lg">send</span>} onClick={submit}>{studentState === "correction_requested" ? "Reenviar corrección" : "Enviar entrega"}</Button>
          </div>
        </CardContent>
      </Card>
    )}

    {!delivery && isPastDue && <EmptyState icon="lock" title="Entrega cerrada" description="La fecha límite ya pasó y no registraste una entrega. Si necesitás ayuda, hacé una consulta al docente." />}
  </div>;
}
