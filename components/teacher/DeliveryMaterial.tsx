'use client';

import { useState } from 'react';
import type { Delivery } from '@/types';
import { parseDeliverySubmission } from '@/types';
import { getTeacherDeliveryFileDownloadUrl } from '@/lib/actions';
import { Button, useToast } from '@/components/ui';
import { TeacherDeliveryHistory } from '@/components/TpTeacherDeliveries';
import DownloadButtonClient from '@/app/assignments/[id]/deliveries/[deliveryId]/DownloadButtonClient';

export default function DeliveryMaterial({ delivery, dueDate }: { delivery: Delivery; dueDate?: string }) {
  const submission = parseDeliverySubmission(delivery.repositoryUrl);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const { notify } = useToast();

  async function download(deliveryId: string, index: number, name: string, version?: number) {
    setDownloadingFile(`${deliveryId}:${version ?? 'current'}:${index}`);
    try {
      const result = await getTeacherDeliveryFileDownloadUrl(deliveryId, index, version);
      if (!result.success || !result.url) {
        notify({ title: 'No se pudo descargar el archivo', description: result.error, tone: 'error' });
        return;
      }
      const anchor = document.createElement('a');
      anchor.href = result.url;
      anchor.download = name;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.click();
    } catch {
      notify({ title: 'No se pudo descargar el archivo', description: 'Intentá nuevamente.', tone: 'error' });
    } finally {
      setDownloadingFile(null);
    }
  }

  return <div className="space-y-6">
    <section aria-labelledby="submitted-material-title" className="space-y-4">
      <h2 id="submitted-material-title" className="font-headline text-xl font-bold">Material entregado</h2>
      {submission.type === 'url' ? <div className="space-y-3 rounded-[var(--epixum-radius-lg)] bg-[var(--color-surface-container-high)] p-4">
        <p className="break-all text-sm text-[var(--color-on-surface-variant)]">{submission.url}</p>
        <a href={submission.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--color-primary)]"><span className="material-symbols-outlined text-lg" aria-hidden="true">open_in_new</span>Abrir enlace entregado</a>
      </div> : <div className="space-y-3">
        <ul className="space-y-2">{submission.files.map((file, index) => <li key={`${index}-${file.name}`} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-high)] p-3">
          <span className="min-w-0 flex-1 break-all text-sm">{file.name}</span>
          <Button variant="secondary" size="sm" disabled={downloadingFile !== null} isPending={downloadingFile === `${delivery.id}:current:${index}`} pendingLabel="Preparando…" onClick={() => download(delivery.id, index, file.name)} aria-label={`Descargar ${file.name}`}>Descargar</Button>
        </li>)}</ul>
        <DownloadButtonClient deliveryId={delivery.id} />
      </div>}
    </section>
    <TeacherDeliveryHistory delivery={delivery} dueDate={dueDate} downloadingFile={downloadingFile} onDownload={download} />
  </div>;
}
