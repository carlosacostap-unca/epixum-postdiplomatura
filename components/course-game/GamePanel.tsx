'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import styles from './immersive-game.module.css';

export function GamePanel({ title, onClose, children, exitHref, wide = false }: { title: string; onClose: () => void; children: ReactNode; exitHref?: string; wide?: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current!;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { dialog.close(); trigger?.focus(); };
  }, []);
  return <dialog ref={dialogRef} aria-labelledby={titleId} className={`${styles.panel} ${wide ? styles.boardPanel : ''}`}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className={styles.panelInner}>
      <header className={styles.panelHeader}><div><span className={styles.eyebrow}>VALLE DE LAS IDEAS</span><h2 id={titleId}>{title}</h2></div><button type="button" onClick={onClose} aria-label="Cerrar y volver al juego" className={styles.close}>✕</button></header>
      <div className={styles.panelBody}>{children}</div>
      <footer className={styles.panelFooter}><button type="button" onClick={onClose}>← Volver al juego</button>{exitHref ? <Link href={exitHref} className={styles.footerExit}>Volver a Epixum →</Link> : <span>Esc para cerrar</span>}</footer>
    </div>
  </dialog>;
}
