"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import LinkForm from "@/components/LinkForm";
import { ConfirmDialog, EmptyState, IconButton, useToast } from "@/components/ui";
import { deleteLink, getResourceDownloadUrl } from "@/lib/actions";
import type { Link as LinkType } from "@/types";

export default function ResourceList({ links, classId, courseId }: { links: LinkType[]; classId: string; courseId: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [deletingLink, setDeletingLink] = useState<LinkType | null>(null);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isFile = (link: LinkType) => link.type === "file" || link.url.includes("idrivee2.com") || link.url.includes("epixum-javascript-storage");

  const openResource = async (event: React.MouseEvent, link: LinkType) => {
    if (!isFile(link)) return;
    event.preventDefault();
    try {
      const result = await getResourceDownloadUrl(link.id);
      if (result.success && result.url) {
        window.open(result.url, "_blank", "noopener,noreferrer");
        return;
      }
      notify({ title: "No se pudo descargar", description: result.error, tone: "error", duration: null });
    } catch {
      notify({ title: "No se pudo descargar", description: "Intentá nuevamente.", tone: "error", duration: null });
    }
  };

  const confirmDelete = async () => {
    if (!deletingLink) return;
    setIsDeleting(true);
    try {
      const result = await deleteLink(deletingLink.id, classId, "class");
      if (!result.success) {
        notify({ title: "No se pudo eliminar el recurso", description: result.error, tone: "error", duration: null });
        return;
      }
      setDeletingLink(null);
      notify({ title: "Recurso eliminado", tone: "success" });
      router.refresh();
    } catch {
      notify({ title: "No se pudo eliminar el recurso", description: "Intentá nuevamente.", tone: "error", duration: null });
    } finally {
      setIsDeleting(false);
    }
  };

  if (links.length === 0) {
    return (
      <EmptyState
        icon="folder_open"
        title="Esta clase no tiene recursos"
        description="Añadí un enlace o archivo para que el material quede disponible en la clase."
        action={<Link href={`/docentes/cursos/${courseId}/clases/${classId}/recursos/nuevo`} className="inline-flex min-h-11 items-center rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]">Añadir recurso</Link>}
      />
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="class-resources-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><h2 id="class-resources-title" className="font-headline text-2xl font-bold">Recursos de la clase</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{links.length} {links.length === 1 ? "recurso" : "recursos"}</p></div>
        <Link href={`/docentes/cursos/${courseId}/clases/${classId}/recursos/nuevo`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-primary)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">add</span>Añadir recurso</Link>
      </div>
      <div className="space-y-3">
        {links.map((link) => (
          <div key={link.id} className="flex items-center gap-3 rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-low)] p-4">
            <a href={isFile(link) ? "#" : link.url} target={isFile(link) ? undefined : "_blank"} rel="noopener noreferrer" onClick={(event) => openResource(event, link)} className="flex min-w-0 flex-1 items-center gap-4 rounded-lg">
              <span className="material-symbols-outlined text-[var(--color-primary)]" aria-hidden="true">{isFile(link) ? "description" : "link"}</span>
              <span className="min-w-0"><span className="block truncate font-bold">{link.title}</span><span className="block truncate text-sm text-[var(--color-on-surface-variant)]">{isFile(link) ? "Archivo descargable" : link.url}</span></span>
            </a>
            <IconButton label={`Editar ${link.title}`} icon={<span className="material-symbols-outlined">edit</span>} variant="ghost" onClick={() => setEditingLink(link)} />
            <IconButton label={`Eliminar ${link.title}`} icon={<span className="material-symbols-outlined">delete</span>} variant="ghost" onClick={() => setDeletingLink(link)} />
          </div>
        ))}
      </div>

      {editingLink && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><LinkForm classId={classId} link={editingLink} onClose={() => setEditingLink(null)} /></div>}
      <ConfirmDialog open={Boolean(deletingLink)} onOpenChange={(open) => !open && setDeletingLink(null)} title="Eliminar recurso" description={<>Se eliminará <strong>{deletingLink?.title}</strong> de esta clase. Esta acción no se puede deshacer.</>} confirmLabel="Eliminar recurso" tone="danger" isPending={isDeleting} onConfirm={confirmDelete} />
    </section>
  );
}
