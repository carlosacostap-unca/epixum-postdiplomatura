'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Link as LinkType } from '@/types';
import type { ResourceParent } from '@/lib/resource-parent';
import LinkForm from '@/components/LinkForm';
import { deleteLink, getResourceDownloadUrl } from '@/lib/actions';
import { Button, ConfirmDialog, EmptyState, IconButton, useToast } from '@/components/ui';

export function ResourceManager({ links, parent }: { links: LinkType[]; parent: ResourceParent }) {
  const router = useRouter();
  const { notify } = useToast();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<LinkType | null>(null);
  const [deleting, setDeleting] = useState<LinkType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const formParent = parent.type === 'class' ? { classId: parent.id } : parent.type === 'assignment' ? { assignmentId: parent.id } : { contentId: parent.id };
  const isFile = (link: LinkType) => link.type === 'file' || link.url.includes('idrivee2.com') || link.url.includes('epixum-javascript-storage');

  const open = async (event: React.MouseEvent<HTMLAnchorElement>, link: LinkType) => {
    if (!isFile(link)) return;
    event.preventDefault();
    setDownloadingId(link.id);
    const result = await getResourceDownloadUrl(link.id);
    setDownloadingId(null);
    if (!result.success || !result.url) {
      notify({ title: 'No se pudo descargar', description: result.error, tone: 'error' });
      return;
    }
    window.open(result.url, '_blank', 'noopener,noreferrer');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    const result = await deleteLink(deleting.id, parent.id, parent.type);
    setIsDeleting(false);
    if (!result.success) {
      notify({ title: 'No se pudo eliminar el recurso', description: result.error, tone: 'error' });
      return;
    }
    setDeleting(null);
    notify({ title: 'Recurso eliminado', tone: 'success' });
    router.refresh();
  };

  return <section aria-labelledby="content-resources-title" className="space-y-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 id="content-resources-title" className="font-headline text-2xl font-bold">Recursos</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Archivos y enlaces asociados a este contenido.</p></div><Button onClick={() => setAdding(true)} leadingIcon={<span className="material-symbols-outlined text-lg">add</span>}>Añadir recurso</Button></div>
    {links.length === 0 && !adding ? <EmptyState icon="folder_open" title="Sin recursos" description="Añadí un enlace o archivo para complementar el contenido." /> : <div className="space-y-3">{links.map((link) => <div key={link.id} className="flex items-center gap-3 rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-low)] p-4"><a href={isFile(link) ? '#' : link.url} target="_blank" rel="noopener noreferrer" onClick={(event) => open(event, link)} className="flex min-w-0 flex-1 items-center gap-4"><span className={`material-symbols-outlined text-[var(--color-primary)] ${downloadingId === link.id ? 'animate-spin' : ''}`}>{downloadingId === link.id ? 'progress_activity' : isFile(link) ? 'description' : 'link'}</span><span className="min-w-0"><span className="block truncate font-bold">{link.title}</span><span className="block truncate text-sm text-[var(--color-on-surface-variant)]">{isFile(link) ? 'Archivo descargable' : link.url}</span></span></a><IconButton label={`Editar ${link.title}`} icon={<span className="material-symbols-outlined">edit</span>} variant="ghost" onClick={() => setEditing(link)} /><IconButton label={`Eliminar ${link.title}`} icon={<span className="material-symbols-outlined">delete</span>} variant="ghost" onClick={() => setDeleting(link)} /></div>)}</div>}
    {adding ? <div className="rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-6"><LinkForm {...formParent} isEmbedded onClose={() => { setAdding(false); router.refresh(); }} /></div> : null}
    {editing ? <div className="rounded-[var(--epixum-radius-xl)] bg-[var(--color-surface-container-low)] p-6"><LinkForm {...formParent} link={editing} isEmbedded onClose={() => { setEditing(null); router.refresh(); }} /></div> : null}
    <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} title="Eliminar recurso" description={<>Se eliminará <strong>{deleting?.title}</strong>. Esta acción no se puede deshacer.</>} confirmLabel="Eliminar recurso" tone="danger" isPending={isDeleting} onConfirm={confirmDelete} />
  </section>;
}
