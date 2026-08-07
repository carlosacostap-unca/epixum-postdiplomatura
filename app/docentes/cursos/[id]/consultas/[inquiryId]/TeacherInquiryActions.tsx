"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, useToast } from "@/components/ui";
import { createInquiryResponse, updateInquiryStatus } from "@/lib/actions-inquiries";

export default function TeacherInquiryActions({ inquiryId, currentStatus }: { inquiryId: string; currentStatus: string }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { notify } = useToast();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    setIsSending(true);
    setError(null);
    const result = await createInquiryResponse(inquiryId, content.trim());
    setIsSending(false);
    if (!result.success) {
      setError(result.error || "No se pudo enviar la respuesta.");
      return;
    }
    setContent("");
    notify({ title: "Respuesta enviada", tone: "success" });
    router.refresh();
  };

  const toggleStatus = () => {
    const status = currentStatus === "Pendiente" ? "Resuelta" : "Pendiente";
    startTransition(async () => {
      setError(null);
      const result = await updateInquiryStatus(inquiryId, status);
      if (!result.success) {
        setError(result.error || "No se pudo actualizar el estado.");
        return;
      }
      notify({ title: status === "Resuelta" ? "Consulta resuelta" : "Consulta reabierta", tone: "success" });
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5 rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-6 md:p-8">
      <div><h2 className="font-headline text-2xl font-bold">Responder</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">La respuesta quedará visible dentro de esta conversación.</p></div>
      {error && <p role="alert" className="rounded-[var(--epixum-radius-md)] bg-[var(--color-error)]/10 p-3 text-sm text-[var(--color-error)]">{error}</p>}
      <Field label="Tu respuesta" id="teacher-inquiry-response"><textarea id="teacher-inquiry-response" value={content} onChange={(event) => setContent(event.target.value)} rows={5} required className="w-full resize-y rounded-[var(--epixum-radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-4 py-3" /></Field>
      <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row">
        <Button type="button" variant="secondary" isPending={isPending} pendingLabel="Actualizando…" leadingIcon={<span className="material-symbols-outlined text-lg">{currentStatus === "Pendiente" ? "check_circle" : "undo"}</span>} onClick={toggleStatus}>{currentStatus === "Pendiente" ? "Marcar como resuelta" : "Reabrir consulta"}</Button>
        <Button type="submit" disabled={!content.trim()} isPending={isSending} pendingLabel="Enviando…" leadingIcon={<span className="material-symbols-outlined text-lg">send</span>}>Enviar respuesta</Button>
      </div>
    </form>
  );
}
