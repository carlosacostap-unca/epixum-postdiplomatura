'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui';
import type { LiveCommand, LiveState } from '@/lib/live-interactive-contract';
import { livePost } from './LiveEntry';
import { LiveRoomView } from './LiveRoomView';

export function LiveRoom({ initial }: { initial: LiveState }) {
  const [state, setState] = useState(initial);
  const [results, setResults] = useState('');
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [link, setLink] = useState('');
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const base = `/api/interactivas/sesiones/${initial.session.id}`;
  const active = state.session.status === 'live';

  useEffect(() => {
    let disposed = false;
    let running = false;
    let queued = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastFetch = 0;
    const abort = new AbortController();
    const refresh = async () => {
      if (running) { queued = true; return; }
      if (disposed) return;
      running = true;
      lastFetch = Date.now();
      try {
        const response = await fetch(base + (results ? `?actividad=${encodeURIComponent(results)}` : ''), { cache: 'no-store', signal: abort.signal });
        const data = await response.json();
        if (disposed) return;
        if (!response.ok) {
          if ([401, 403, 404].includes(response.status)) { setDenied(true); events?.close(); }
          throw new Error(data.error || 'No se pudo actualizar la clase.');
        }
        setState(data); setConnectionError(''); setDenied(false);
        setLink(`${window.location.origin}/interactivas?codigo=${data.session.code}`);
      } catch (error) {
        if (!disposed) { setConnectionError(error instanceof Error ? error.message : 'Se perdió la conexión.'); setConnected(false); }
      } finally {
        running = false;
        if (queued && !disposed) { queued = false; schedule(); }
      }
    };
    // Coalesce presence/response bursts: one teacher snapshot per second at most.
    const schedule = () => {
      if (timer || disposed) return;
      timer = setTimeout(() => { timer = undefined; void refresh(); }, Math.max(150, 1000 - (Date.now() - lastFetch)));
    };
    const events = active ? new EventSource(`${base}/events`) : null;
    events?.addEventListener('ready', () => { setConnected(true); schedule(); });
    events?.addEventListener('change', schedule);
    if (events) events.onerror = () => { if (!disposed) setConnected(false); };
    refreshRef.current = refresh;
    void refresh();
    const fallback = setInterval(() => void refresh(), 10_000);
    const heartbeat = active && initial.role === 'student' ? setInterval(() => {
      void livePost(base, { kind: 'heartbeat' }).catch(() => { if (!disposed) setConnected(false); });
    }, 15_000) : undefined;
    const onVisible = () => { if (document.visibilityState === 'visible') schedule(); };
    window.addEventListener('online', schedule);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      disposed = true; abort.abort(); events?.close(); clearInterval(fallback); clearInterval(heartbeat); clearTimeout(timer);
      window.removeEventListener('online', schedule); document.removeEventListener('visibilitychange', onVisible);
    };
  }, [base, results, active, initial.role]);

  async function send(command: LiveCommand) {
    if (pending) return false;
    setPending(true); setError('');
    try { await livePost(base, command); await refreshRef.current(); return true; }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo completar la operación.'); await refreshRef.current(); return false; }
    finally { setPending(false); }
  }

  if (denied) return <Card><CardContent><h1 className="text-2xl font-bold">La clase no está disponible</h1><p role="alert" className="my-4">{connectionError}</p><Link href={`/login?next=${encodeURIComponent(`/interactivas/sesion/${initial.session.id}`)}`} className="font-bold text-[var(--color-primary)]">Volver a iniciar sesión</Link></CardContent></Card>;
  return <LiveRoomView state={state} results={results} setResults={setResults} send={send} pending={pending} connected={connected} connectionError={connectionError} error={error} refresh={() => refreshRef.current()} link={link} />;
}
