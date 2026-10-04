'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui';

interface ContentPortal { window: Window; container: HTMLElement }

/** A second view of the current screen, without another session or transport. */
export function ContentWindow({ title, children, mode = 'student' }: { title: string; children: ReactNode; mode?: 'student' | 'projection' | 'notes' }) {
  const [portal, setPortal] = useState<ContentPortal | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!portal) return;
    const close = () => { if (!portal.window.closed) portal.window.close(); };
    const timer = window.setInterval(() => {
      if (portal.window.closed) setPortal(null);
    }, 500);
    // Close on navigation, loss of access, simulation reset, or parent tab exit.
    window.addEventListener('pagehide', close);
    const onChildExit = () => setPortal(null);
    portal.window.addEventListener('pagehide', onChildExit);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', close);
      portal.window.removeEventListener('pagehide', onChildExit);
      close();
    };
  }, [portal]);

  function openContent() {
    if (portal && !portal.window.closed) { portal.window.focus(); return; }
    // Open synchronously from the click, so browsers can allow the requested popup.
    const popup = window.open('', '_blank', 'popup,width=1100,height=800,resizable=yes,scrollbars=yes');
    if (!popup) {
      setError('El navegador bloqueó la ventana. Permití las ventanas emergentes para este sitio y volvé a intentarlo.');
      return;
    }
    try {
      popup.opener = null;
      const target = popup.document;
      // A blank popup starts in quirks mode. Only this fixed shell uses HTML;
      // all lesson content is rendered by React below, never interpolated here.
      target.open();
      target.write('<!doctype html><html><head></head><body></body></html>');
      target.close();
      target.title = `${title} · ${mode === 'notes' ? 'Guion docente' : mode === 'projection' ? 'Proyección' : 'Contenido de la clase'}`;
      target.documentElement.lang = document.documentElement.lang || 'es';
      target.documentElement.className = document.documentElement.className;
      target.body.className = document.body.className;
      const base = target.createElement('base');
      base.href = window.location.href;
      target.head.appendChild(base);
      const viewport = target.createElement('meta');
      viewport.name = 'viewport'; viewport.content = 'width=device-width, initial-scale=1';
      target.head.appendChild(viewport);
      // Copy only application styles, never scripts, page markup or teacher data.
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((style) => target.head.appendChild(style.cloneNode(true)));
      const container = target.createElement('main');
      container.className = 'mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6';
      container.setAttribute('aria-label', mode === 'notes' ? 'Guion docente privado' : mode === 'projection' ? 'Proyección de la clase' : 'Contenido de la clase');
      target.body.appendChild(container);
      setPortal({ window: popup, container });
      setError('');
      popup.focus();
    } catch {
      popup.close();
      setError('No se pudo abrir el contenido. Volvé a intentarlo desde esta clase.');
    }
  }

  return <div className="space-y-2">
    <Button variant="secondary" onClick={openContent}>{mode === 'notes' ? (portal ? 'Volver a la ventana del guion' : 'Abrir guion en otra ventana') : mode === 'projection' ? (portal ? 'Volver a la ventana de proyección' : 'Abrir ventana de proyección') : (portal ? 'Volver a la ventana de contenido' : 'Abrir sólo el contenido en una ventana nueva')}</Button>
    {portal && <p className="text-sm text-[var(--color-text-muted)]">{mode === 'notes' ? 'Ventana privada para vos. Mantené este panel abierto: el guion sigue la pantalla actual. Para los alumnos, compartí la ventana de proyección.' : mode === 'projection' ? 'Compartí sólo la ventana de proyección o movela a la pantalla de los alumnos. Mantené este panel abierto para seguir manejando la clase.' : 'Mantené esta clase abierta para que la ventana de contenido siga sincronizada.'}</p>}
    {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}
    {portal && createPortal(children, portal.container)}
  </div>;
}
