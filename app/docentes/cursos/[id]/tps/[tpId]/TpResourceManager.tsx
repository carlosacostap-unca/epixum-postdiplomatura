"use client";

import { useState } from "react";
import { Link as LinkType } from "@/types";
import { deleteLink, getResourceDownloadUrl } from "@/lib/actions";
import { useRouter } from "next/navigation";
import LinkForm from "@/components/LinkForm";
import { ConfirmDialog, useToast } from "@/components/ui";

interface TpResourceManagerProps {
  links: LinkType[];
  assignmentId: string;
}

export default function TpResourceManager({ links, assignmentId }: TpResourceManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingLink, setDeletingLink] = useState<LinkType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { notify } = useToast();

  const isFileResource = (link: LinkType) =>
    link.type === 'file' || link.url.includes('idrivee2.com') || link.url.includes('epixum-javascript-storage');

  const handleResourceClick = async (e: React.MouseEvent, link: LinkType) => {
    if (isFileResource(link)) {
      e.preventDefault();
      setDownloadingId(link.id);
      try {
        const result = await getResourceDownloadUrl(link.id);
        if (result.success && result.url) {
          window.open(result.url, '_blank');
        } else {
          notify({ title: "No se pudo descargar el archivo", description: result.error, tone: "error", duration: null });
        }
      } catch {
        notify({ title: "Error al descargar el archivo", description: "Intentá nuevamente en unos segundos.", tone: "error", duration: null });
      } finally {
        setDownloadingId(null);
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingLink) return;
    setIsDeleting(true);
    try {
      const result = await deleteLink(deletingLink.id, assignmentId, 'assignment');
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

  return (
    <div className="flex flex-col gap-4">
      {links.length === 0 && !isAdding && (
        <div className="bg-[var(--color-surface-container-low)] rounded-[2rem] p-8 text-center flex flex-col items-center justify-center border border-[var(--color-outline-variant)]">
          <span className="material-symbols-outlined text-4xl text-[var(--color-on-surface-variant)] mb-3">description</span>
          <p className="text-[var(--color-on-surface-variant)] text-sm">Sin recursos adjuntos.</p>
        </div>
      )}

      {links.map((link) =>
        editingLink?.id === link.id ? (
          <div key={link.id} className="bg-[var(--color-surface-container-low)] rounded-[2rem] p-6 border border-[var(--color-outline-variant)]">
            <LinkForm
              link={link}
              assignmentId={assignmentId}
              isEmbedded
              onClose={() => { setEditingLink(null); router.refresh(); }}
            />
          </div>
        ) : (
          <div
            key={link.id}
            className="bg-[var(--color-surface-container-low)] rounded-[2rem] p-5 border border-[var(--color-outline-variant)] flex items-center gap-3 group"
          >
            <span className={`material-symbols-outlined text-[20px] shrink-0 ${isFileResource(link) ? 'text-[var(--color-primary)]' : 'text-blue-400'}`}>
              {isFileResource(link) ? 'description' : 'link'}
            </span>
            <a
              href={isFileResource(link) ? '#' : link.url}
              target={isFileResource(link) ? undefined : '_blank'}
              rel={isFileResource(link) ? undefined : 'noopener noreferrer'}
              onClick={(e) => handleResourceClick(e, link)}
              className="flex-1 text-sm font-medium text-[var(--color-on-surface)] hover:text-[var(--color-primary)] transition-colors truncate"
            >
              {downloadingId === link.id ? 'Descargando...' : link.title}
            </a>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditingLink(link)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] transition-colors"
                title="Editar"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
              <button
                onClick={() => setDeletingLink(link)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--color-on-surface-variant)] hover:text-red-400 transition-colors"
                title="Eliminar"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          </div>
        )
      )}

      {isAdding ? (
        <div className="bg-[var(--color-surface-container-low)] rounded-[2rem] p-6 border border-[var(--color-outline-variant)]">
          <LinkForm
            assignmentId={assignmentId}
            isEmbedded
            onClose={() => { setIsAdding(false); router.refresh(); }}
          />
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-container)] transition-colors text-sm font-bold text-[var(--color-on-surface-variant)] hover:text-[var(--color-primary)]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Agregar recurso
        </button>
      )}

      <ConfirmDialog
        open={Boolean(deletingLink)}
        onOpenChange={(open) => !open && setDeletingLink(null)}
        title="Eliminar recurso"
        description={<>Vas a eliminar <strong>{deletingLink?.title}</strong> de este trabajo práctico. Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar recurso"
        tone="danger"
        isPending={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
