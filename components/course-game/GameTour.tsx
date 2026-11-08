'use client';
import { useEffect, useRef } from 'react';
import { PLATFORM_URL, TOUR_STEPS } from '@/lib/course-game/onboarding';
import styles from './welcome.module.css';

export interface GameTourProps { step: number; busy: boolean; error: string; onNext: () => void }
export function GameTour({ step, busy, error, onNext }: GameTourProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close(); }, []);
  const item = TOUR_STEPS[step];
  if (!item) return null;
  return <dialog ref={ref} className={styles.tour} aria-labelledby="tour-title" aria-describedby="tour-description" onCancel={event => event.preventDefault()}>
    <div className={styles.tourBody}><span className={styles.caption}>CONOCÉ TU AULA · {step + 1} DE {TOUR_STEPS.length}</span><progress value={step + 1} max={TOUR_STEPS.length} aria-label="Recorrido de bienvenida" /><div aria-live="polite"><h2 id="tour-title">{item.title}</h2><p id="tour-description">{item.description}</p></div>{error && <p className={styles.error} role="alert">{error}</p>}<button type="button" disabled={busy} className={styles.primary} onClick={onNext}>{busy ? 'Guardando…' : step === TOUR_STEPS.length - 1 ? '¡Comenzar mi aventura!' : 'Entendido, siguiente →'}</button><a href={PLATFORM_URL}>Volver a Epixum y continuar después</a></div>
  </dialog>;
}
