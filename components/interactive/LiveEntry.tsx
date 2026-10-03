'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

export async function livePost(url: string, body: unknown) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'No pudimos completar la operación.');
  return data;
}

export function StartLiveSession({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <div className="space-y-3">
    <Button isPending={pending} pendingLabel="Abriendo sesión…" onClick={async () => {
      setPending(true); setError('');
      try { const result = await livePost('/api/interactivas/iniciar', { courseId, lessonId }); router.push(`/docentes/interactivas/sesiones/${result.id}`); }
      catch (error) { setError(error instanceof Error ? error.message : 'No se pudo iniciar.'); setPending(false); }
    }}>Iniciar o retomar sesión en vivo</Button>
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
  </div>;
}

export function JoinLiveSession({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  return <form className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setError('');
    try { const result = await livePost('/api/interactivas/ingresar', { code: code.trim() }); router.push(`/interactivas/sesion/${result.id}`); }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo ingresar.'); setPending(false); }
  }}>
    <div><label htmlFor="session-code" className="mb-2 block font-semibold">Código de la clase</label>
      <input id="session-code" name="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={8} minLength={8} pattern="[A-Za-z0-9]{8}" required placeholder="A1B2C3D4" className="w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] p-4 font-mono text-2xl tracking-widest" />
    </div>
    <Button type="submit" isPending={pending} pendingLabel="Ingresando…" disabled={code.trim().length !== 8} className="w-full">Entrar a la clase</Button>
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
    <p className="text-sm text-[var(--color-text-muted)]">Vas a ingresar con tu cuenta del campus. Necesitás estar matriculado en el curso.</p>
  </form>;
}
