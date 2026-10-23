'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export function ExamListRefresh() {
  const router = useRouter();
  useEffect(() => { const timer = window.setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 15_000); return () => window.clearInterval(timer); }, [router]);
  return <button className="min-h-11 font-bold text-[var(--color-primary)]" onClick={() => router.refresh()}>Actualizar parciales</button>;
}
