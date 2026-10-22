'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export function PreparationMonitor() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (pending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') startTransition(() => router.refresh());
    }, 15000);
    return () => window.clearInterval(timer);
  }, [router, pending]);
  return <div className="flex flex-wrap items-center gap-3"><Button variant="secondary" isPending={pending} pendingLabel="Actualizando seguimiento…" onClick={() => startTransition(() => router.refresh())}>Actualizar seguimiento</Button><p className="text-sm text-[var(--color-text-muted)]">Se actualiza cada 15 segundos mientras esta página está visible.</p></div>;
}
