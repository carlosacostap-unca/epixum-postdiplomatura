"use client";

import { Link as LinkType } from "@/types";
import { getResourceDownloadUrl, deleteLink } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LinkForm from "@/components/LinkForm";

interface ResourceListProps {
  links: LinkType[];
  classId: string;
}

export default function ResourceList({ links, classId }: ResourceListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<LinkType | null>(null);

  const isFileResource = (link: LinkType) => {
    return link.type === 'file' || 
           link.url.includes('idrivee2.com') || 
           link.url.includes('epixum-javascript-storage');
  };

  const handleResourceClick = async (e: React.MouseEvent, link: LinkType) => {
    if (isFileResource(link)) {
        e.preventDefault();
        try {
            const result = await getResourceDownloadUrl(link.id);
            if (result.success && result.url) {
                window.open(result.url, '_blank');
            } else {
                alert("No se pudo descargar el archivo.");
            }
        } catch (error) {
            console.error(error);
            alert("Error al descargar el archivo.");
        }
    }
  };

  const handleDelete = async (e: React.MouseEvent, linkId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm("¿Estás seguro de que querés eliminar este recurso?")) return;

    setDeletingId(linkId);
    try {
      const result = await deleteLink(linkId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "No se pudo eliminar el recurso");
      }
    } catch (error) {
      console.error(error);
      alert("Error al eliminar el recurso");
    } finally {
      setDeletingId(null);
    }
  };

  if (links.length === 0) {
    return null;
  }

  return (
    <section className="bg-[var(--color-surface-container-low)] rounded-[2.5rem] p-10 border border-[var(--color-outline-variant)]">
      <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-[var(--color-primary)]">folder_open</span>
        Recursos de la clase
      </h2>
      
      <div className="flex flex-col gap-4">
        {links.map((link) => (
          <div 
            key={link.id}
            className="flex items-center justify-between p-4 rounded-2xl bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] border border-[var(--color-outline-variant)] transition-all group"
          >
            <a 
              href={isFileResource(link) ? '#' : link.url} 
              target={isFileResource(link) ? undefined : "_blank"}
              rel={isFileResource(link) ? undefined : "noopener noreferrer"}
              onClick={(e) => handleResourceClick(e, link)}
              className="flex items-center gap-4 flex-1 min-w-0"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isFileResource(link) 
                  ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-on-primary)]' 
                  : 'bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] group-hover:bg-[var(--color-on-surface)] group-hover:text-[var(--color-surface)]'
              }`}>
                <span className="material-symbols-outlined">
                  {isFileResource(link) ? 'description' : 'link'}
                </span>
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-bold text-[var(--color-on-surface)] truncate">
                  {link.title}
                </h3>
                <p className="text-sm text-[var(--color-on-surface-variant)] truncate mt-0.5">
                  {isFileResource(link) ? (decodeURIComponent(link.url.split('/').pop() || '')) : link.url}
                </p>
              </div>
            </a>
            
            <div className="flex items-center gap-2 pl-4 border-l border-[var(--color-outline-variant)]">
              <button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setEditingLink(link);
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors"
                title="Editar recurso"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button 
                onClick={(e) => handleDelete(e, link.id)}
                disabled={deletingId === link.id}
                className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-on-surface-variant)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] transition-colors disabled:opacity-50"
                title="Eliminar recurso"
              >
                {deletingId === link.id ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <LinkForm classId={classId} link={editingLink} onClose={() => setEditingLink(null)} />
        </div>
      )}
    </section>
  );
}