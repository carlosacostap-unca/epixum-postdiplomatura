"use client";

import { useState } from "react";
import { EmptyState, useToast } from "@/components/ui";
import { getResourceDownloadUrl } from "@/lib/actions";
import type { Link as LinkType } from "@/types";

export default function StudentResourceList({ links }: { links: LinkType[] }) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { notify } = useToast();
  const isFile = (link: LinkType) => link.type === "file" || link.url.includes("idrivee2.com") || link.url.includes("epixum-javascript-storage");
  const open = async (event: React.MouseEvent<HTMLAnchorElement>, link: LinkType) => {
    if (!isFile(link)) return;
    event.preventDefault();
    setDownloadingId(link.id);
    const result = await getResourceDownloadUrl(link.id);
    setDownloadingId(null);
    if (!result.success || !result.url) { notify({ title: "No se pudo descargar", description: result.error, tone: "error" }); return; }
    window.open(result.url, "_blank", "noopener,noreferrer");
  };
  if (links.length === 0) return <EmptyState icon="folder_off" title="Sin recursos" description="El docente todavía no publicó materiales para esta clase." />;
  return <section aria-labelledby="class-materials-title" className="space-y-5"><div><h2 id="class-materials-title" className="font-headline text-2xl font-bold">Material de estudio</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{links.length} {links.length === 1 ? "recurso disponible" : "recursos disponibles"}</p></div><div className="grid gap-3 md:grid-cols-2">{links.map((link) => <a key={link.id} href={isFile(link) ? "#" : link.url} target="_blank" rel="noopener noreferrer" onClick={(event) => open(event, link)} aria-busy={downloadingId === link.id} className="flex min-w-0 items-center gap-4 rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-low)] p-4 transition-colors hover:bg-[var(--color-surface-container)]"><span className={`material-symbols-outlined text-[var(--color-primary)] ${downloadingId === link.id ? "animate-spin" : ""}`} aria-hidden="true">{downloadingId === link.id ? "progress_activity" : isFile(link) ? "download" : "open_in_new"}</span><span className="min-w-0"><span className="block truncate font-bold">{downloadingId === link.id ? "Preparando descarga…" : link.title}</span><span className="block truncate text-sm text-[var(--color-on-surface-variant)]">{isFile(link) ? "Archivo descargable" : link.url}</span></span></a>)}</div></section>;
}
