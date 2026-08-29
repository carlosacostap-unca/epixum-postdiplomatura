"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormattedDate from "./FormattedDate";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Select,
  useToast,
} from "@/components/ui";
import { getTeacherDeliveryFileDownloadUrl, updateDeliveryEvaluation } from "@/lib/actions";
import { Delivery, parseDeliverySubmission, type AIVerdict } from "@/types";

type ReviewFilter = "all" | "pending" | "draft" | "published";

function reviewStatus(delivery: Delivery): Exclude<ReviewFilter, "all"> {
  return delivery.status === "draft" || delivery.status === "published" ? delivery.status : "pending";
}

const statusCopy = {
  pending: { label: "Sin evaluar", tone: "warning" as const },
  draft: { label: "Borrador", tone: "info" as const },
  published: { label: "Publicada", tone: "success" as const },
};

export default function TpTeacherDeliveries({ deliveries, courseId, assignmentId }: { deliveries: Delivery[]; courseId: string; assignmentId: string }) {
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const { notify } = useToast();

  const counts = useMemo(() => ({
    all: deliveries.length,
    pending: deliveries.filter((item) => reviewStatus(item) === "pending").length,
    draft: deliveries.filter((item) => reviewStatus(item) === "draft").length,
    published: deliveries.filter((item) => reviewStatus(item) === "published").length,
  }), [deliveries]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return deliveries.filter((delivery) => {
      if (filter !== "all" && reviewStatus(delivery) !== filter) return false;
      const student = delivery.expand?.student;
      const identity = [student?.name, student?.firstName, student?.lastName, student?.email].filter(Boolean).join(" ").toLocaleLowerCase("es");
      return !normalized || identity.includes(normalized);
    });
  }, [deliveries, filter, query]);

  const download = async (deliveryId: string, fileIndex: number, name: string) => {
    const downloadId = `${deliveryId}:${fileIndex}`;
    setDownloadingFile(downloadId);
    const result = await getTeacherDeliveryFileDownloadUrl(deliveryId, fileIndex);
    setDownloadingFile(null);
    if (!result.success || !result.url) {
      notify({ title: "No se pudo descargar el archivo", description: result.error, tone: "error" });
      return;
    }
    const anchor = document.createElement("a");
    anchor.href = result.url;
    anchor.download = name;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
  };

  if (deliveries.length === 0) {
    return <EmptyState icon="inbox" title="Todavía no hay entregas" description="Las entregas de estudiantes aparecerán aquí para su revisión." />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-5 md:grid-cols-[minmax(0,1fr)_14rem]">
        <Field label="Buscar estudiante" id="delivery-search">
          <input id="delivery-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o correo" className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5" />
        </Field>
        <Field label="Estado de revisión" id="delivery-status">
          <Select id="delivery-status" value={filter} onChange={(event) => setFilter(event.target.value as ReviewFilter)}>
            <option value="all">Todas ({counts.all})</option>
            <option value="pending">Sin evaluar ({counts.pending})</option>
            <option value="draft">Borradores ({counts.draft})</option>
            <option value="published">Publicadas ({counts.published})</option>
          </Select>
        </Field>
      </div>

      <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">{filtered.length} {filtered.length === 1 ? "entrega encontrada" : "entregas encontradas"}</p>

      {filtered.length === 0 ? (
        <EmptyState icon="filter_alt_off" title="No hay coincidencias" description="Probá otro nombre o cambiá el estado de revisión." action={<Button variant="secondary" onClick={() => { setQuery(""); setFilter("all"); }}>Limpiar filtros</Button>} />
      ) : (
        <div className="space-y-4">
          {filtered.map((delivery) => {
            const student = delivery.expand?.student;
            const submission = parseDeliverySubmission(delivery.repositoryUrl);
            const files = submission.type === "files" ? submission.files : [];
            const isExpanded = expandedDelivery === delivery.id;
            const state = reviewStatus(delivery);
            const studentLabel = [student?.firstName || student?.name, student?.lastName].filter(Boolean).join(" ") || "Estudiante";

            return (
              <article key={delivery.id} className="overflow-hidden rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)]">
                <button type="button" aria-expanded={isExpanded} aria-controls={`delivery-${delivery.id}`} onClick={() => setExpandedDelivery(isExpanded ? null : delivery.id)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-[var(--color-surface-container)] md:p-6">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 font-bold text-[var(--color-primary)]" aria-hidden="true">{studentLabel.charAt(0).toUpperCase()}</span>
                    <span className="min-w-0"><span className="block truncate font-bold">{studentLabel}</span><span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">{submission.type === "url" ? "Enlace" : `${files.length} ${files.length === 1 ? "archivo" : "archivos"}`} · <FormattedDate date={delivery.created} showTime /></span></span>
                  </div>
                  <span className="flex shrink-0 items-center gap-3"><Badge tone={statusCopy[state].tone}>{statusCopy[state].label}</Badge><span className={`material-symbols-outlined transition-transform ${isExpanded ? "rotate-180" : ""}`} aria-hidden="true">expand_more</span></span>
                </button>

                {isExpanded && (
                  <div id={`delivery-${delivery.id}`} className="space-y-7 border-t border-[var(--color-outline-variant)] p-5 md:p-6">
                    <section aria-labelledby={`files-${delivery.id}`}>
                      <h3 id={`files-${delivery.id}`} className="text-sm font-bold uppercase tracking-wide text-[var(--color-on-surface-variant)]">{submission.type === "url" ? "Enlace entregado" : "Archivos entregados"}</h3>
                      {submission.type === "url" ? (
                        <a href={submission.url} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-11 items-center gap-3 rounded-[var(--epixum-radius-pill)] bg-[var(--color-surface-container-highest)] px-5 py-2.5 text-sm font-bold hover:text-[var(--color-primary)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">open_in_new</span><span className="truncate">{submission.url}</span></a>
                      ) : (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {files.map((file, index) => <Button key={`${file.url}-${index}`} variant="secondary" isPending={downloadingFile === `${delivery.id}:${index}`} pendingLabel="Preparando…" leadingIcon={<span className="material-symbols-outlined text-lg">download</span>} onClick={() => download(delivery.id, index, file.name)} className="min-w-0 justify-start"><span className="truncate">{file.name}</span></Button>)}
                        </div>
                      )}
                      <Link
                        href={`/assignments/${assignmentId}/deliveries/${delivery.id}`}
                        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-surface-container-highest)] px-5 py-2.5 text-sm font-bold hover:text-[var(--color-primary)]"
                      >
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">{submission.type === "url" ? "rate_review" : "auto_awesome"}</span>
                        {submission.type === "url" ? "Abrir detalle y evaluación" : "Abrir detalle y preevaluación con IA"}
                      </Link>
                    </section>
                    <FeedbackForm delivery={delivery} courseId={courseId} assignmentId={assignmentId} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeedbackForm({ delivery }: { delivery: Delivery; courseId: string; assignmentId: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [feedback, setFeedback] = useState(delivery.feedback || "");
  const [grade, setGrade] = useState(delivery.grade?.toString() || "");
  const [verdict, setVerdict] = useState<AIVerdict | "">(delivery.verdict || "");
  const [loading, setLoading] = useState<"draft" | "published" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const save = async (status: "draft" | "published") => {
    const numericGrade = grade === "" ? null : Number(grade);
    if (numericGrade !== null && !Number.isFinite(numericGrade)) {
      setError("Ingresá una nota válida o dejala vacía.");
      return;
    }
    if (status === "published" && (!feedback.trim() || !verdict)) {
      setError("Para publicar, completá la devolución y seleccioná un veredicto.");
      setConfirmPublish(false);
      return;
    }

    setLoading(status);
    setError(null);
    const result = await updateDeliveryEvaluation(delivery.id, numericGrade, feedback.trim(), verdict || undefined, status);
    setLoading(null);
    setConfirmPublish(false);
    if (!result.success) {
      setError(result.error || "No se pudo guardar la evaluación.");
      return;
    }
    notify(status === "published"
      ? { title: "Evaluación publicada", description: "La nota y la devolución ya son visibles para el estudiante.", tone: "success" }
      : { title: "Borrador guardado", description: "El estudiante todavía no puede ver esta evaluación.", tone: "info" });
    router.refresh();
  };

  return (
    <section aria-labelledby={`evaluation-${delivery.id}`} className="space-y-5">
      <div><h3 id={`evaluation-${delivery.id}`} className="font-headline text-xl font-bold">Evaluación</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Guardá para continuar más tarde o publicá para hacerla visible.</p></div>
      {error && <p role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">{error}</p>}
      <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)]">
        <Field label="Nota opcional" id={`grade-${delivery.id}`}>
          <input id={`grade-${delivery.id}`} type="number" step="0.01" value={grade} onChange={(event) => setGrade(event.target.value)} className="w-full rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-2.5" />
        </Field>
        <Field label="Veredicto" id={`verdict-${delivery.id}`}>
          <Select id={`verdict-${delivery.id}`} value={verdict} onChange={(event) => setVerdict(event.target.value as typeof verdict)}><option value="">Seleccionar</option><option value="Aprobado">Aprobado</option><option value="Desaprobado">Desaprobado</option><option value="Corregir y reenviar">Corregir y reenviar</option></Select>
        </Field>
      </div>
      <Field label="Devolución para el estudiante" id={`feedback-${delivery.id}`}>
        <textarea id={`feedback-${delivery.id}`} value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={5} className="w-full resize-y rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" />
      </Field>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" isPending={loading === "draft"} pendingLabel="Guardando…" leadingIcon={<span className="material-symbols-outlined text-lg">draft</span>} onClick={() => save("draft")}>Guardar borrador</Button>
        <Button isPending={loading === "published"} pendingLabel="Publicando…" leadingIcon={<span className="material-symbols-outlined text-lg">publish</span>} onClick={() => setConfirmPublish(true)}>Publicar evaluación</Button>
      </div>
      <p className="flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">{delivery.status === "published" ? "visibility" : "visibility_off"}</span>{delivery.status === "published" ? "La evaluación actual es visible para el estudiante." : "La evaluación todavía no es visible para el estudiante."}</p>
      <ConfirmDialog open={confirmPublish} onOpenChange={setConfirmPublish} title="Publicar evaluación" description="La nota, el veredicto y la devolución pasarán a ser visibles para el estudiante. Podrás actualizarlos más adelante." confirmLabel="Publicar ahora" isPending={loading === "published"} onConfirm={() => save("published")} />
    </section>
  );
}
