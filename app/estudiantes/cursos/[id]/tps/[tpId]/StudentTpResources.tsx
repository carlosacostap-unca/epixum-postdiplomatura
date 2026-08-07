"use client";

import { useState } from "react";
import { EmptyState, useToast } from "@/components/ui";
import { getResourceDownloadUrl } from "@/lib/actions";
import type { Link as LinkType } from "@/types";

export default function StudentTpResources({ links }: { links: LinkType[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { notify } = useToast();
  const isFile = (link: LinkType) => link.type === "file" || link.url.includes("idrivee2.com") || link.url.includes("epixum-javascript-storage");
  const open = async (event: React.MouseEvent<HTMLAnchorElement>, link: LinkType) => {
    if (!isFile(link)) return;
    event.preventDefault();
    setDownloadingId(link.id);
    try {
      const result = await getResourceDownloadUrl(link.id);
      if (!result.success || !result.url) { notify({ title: "No se pudo descargar", description: result.error, tone: "error", duration: null }); return; }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch {
      notify({ title: "No se pudo descargar", description: "Intentá nuevamente.", tone: "error", duration: null });
    } finally {
      setDownloadingId(null);
    }
  };
  if (links.length === 0) return <EmptyState className="py-10" icon="folder_off" title="Sin recursos adjuntos" description="El enunciado no tiene material adicional." />;
  return <div className="space-y-3">{links.map((link) => <a key={link.id} href={isFile(link) ? "#" : link.url} target="_blank" rel="noopener noreferrer" onClick={(event) => open(event, link)} className="flex min-w-0 items-center gap-3 rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-low)] p-4 hover:bg-[var(--color-surface-container)]"><span className={`material-symbols-outlined text-[var(--color-primary)] ${downloadingId === link.id ? "animate-spin" : ""}`} aria-hidden="true">{downloadingId === link.id ? "progress_activity" : isFile(link) ? "download" : "open_in_new"}</span><span className="truncate font-bold">{downloadingId === link.id ? "Preparando…" : link.title}</span></a>)}</div>;
}
