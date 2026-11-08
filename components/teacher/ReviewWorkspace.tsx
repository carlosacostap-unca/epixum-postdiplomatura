'use client';

import { createContext, useContext, useEffect, useState, type ReactNode, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui';

type EditingState = { dirty: boolean; busy: boolean };
const ReviewEditingContext = createContext<((state: EditingState) => void) | null>(null);

export function useReviewEditing({ dirty, busy }: EditingState) {
  const setEditing = useContext(ReviewEditingContext);
  useEffect(() => {
    setEditing?.({ dirty, busy });
    return () => setEditing?.({ dirty: false, busy: false });
  }, [setEditing, dirty, busy]);
}

type ReviewLink = { href: string; student: string };

export default function ReviewWorkspace({ children, backHref, previous, next, position, total, filtered }: {
  children: ReactNode;
  backHref: string;
  previous?: ReviewLink;
  next?: ReviewLink;
  position: number;
  total: number;
  filtered: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditingState>({ dirty: false, busy: false });
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    if (!editing.dirty && !editing.busy) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [editing.dirty, editing.busy]);

  function guardNavigation(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search) return;
    if (!editing.busy && !editing.dirty) return;
    event.preventDefault();
    event.stopPropagation();
    if (!editing.busy) setDestination(`${url.pathname}${url.search}${url.hash}`);
  }

  const linkClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--epixum-radius-md)] bg-[var(--color-surface-container-highest)] px-4 py-2 text-sm font-semibold';

  return <ReviewEditingContext.Provider value={setEditing}>
    <div onClickCapture={guardNavigation} className="space-y-6">
      <nav aria-label="Navegación de correcciones" className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--epixum-radius-lg)] border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-3">
        <Link href={backHref} aria-disabled={editing.busy || undefined} className={linkClass}><span className="material-symbols-outlined text-lg" aria-hidden="true">arrow_back</span>Volver a entregas</Link>
        <p className="text-sm text-[var(--color-on-surface-variant)]">{position > 0 ? `${position} de ${total} entregas` : 'Entrega actual'}{filtered ? ' · Vista filtrada' : ''}</p>
        <div className="flex gap-2">
          {previous ? <Link href={previous.href} aria-label={`Anterior: ${previous.student}`} aria-disabled={editing.busy || undefined} className={linkClass}><span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_left</span>Anterior</Link> : <span aria-disabled="true" className={`${linkClass} opacity-40`}>Anterior</span>}
          {next ? <Link href={next.href} aria-label={`Siguiente: ${next.student}`} aria-disabled={editing.busy || undefined} className={linkClass}>Siguiente<span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_right</span></Link> : <span aria-disabled="true" className={`${linkClass} opacity-40`}>Siguiente</span>}
        </div>
      </nav>
      {children}
    </div>
    <ConfirmDialog open={destination !== null} onOpenChange={open => { if (!open) setDestination(null); }} title="Tenés cambios sin guardar" description="Podés seguir editando o salir y descartar los cambios de esta evaluación." cancelLabel="Seguir editando" confirmLabel="Salir sin guardar" onConfirm={() => { if (destination) { const href = destination; setDestination(null); router.push(href); } }} />
  </ReviewEditingContext.Provider>;
}
