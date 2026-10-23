'use client';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui';

export function CourseExamPhoto({ src }: { src?: string }) {
  const [visible, setVisible] = useState(false);
  const [failed, setFailed] = useState(false);
  return <section className="space-y-3 rounded-xl border border-[var(--color-outline-variant)] p-4" aria-label="Foto inicial del parcial">
    <h3 className="text-lg font-bold">Foto inicial del alumno</h3>
    {src ? <>
      <p className="text-sm text-[var(--color-text-muted)]">Una única foto al iniciar el intento. Acceso reservado a administradores y docentes del curso.</p>
      <Button variant="secondary" aria-expanded={visible} onClick={() => setVisible(value => !value)}>{visible ? 'Ocultar foto inicial' : 'Ver foto inicial'}</Button>
      {visible && (failed ? <div><p role="alert">No pudimos cargar la foto inicial.</p><Button variant="secondary" onClick={() => setFailed(false)}>Reintentar foto</Button></div> : <Image unoptimized src={src} width={640} height={480} alt="Foto inicial del alumno en este parcial" onError={() => setFailed(true)} className="h-auto w-full max-w-sm rounded-xl" />)}
    </> : <p>Este intento comenzó sin una foto inicial registrada.</p>}
  </section>;
}
