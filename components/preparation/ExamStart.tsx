'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { beginExamWithPhoto } from '@/lib/actions-exam-camera';
import { useWebcam } from './useWebcam';
import { WebcamPanel } from './WebcamPanel';

export function ExamStart({ courseId, quizId, durationMinutes, questionCount }: { courseId: string; quizId: string; durationMinutes: number; questionCount: number }) {
  const camera = useWebcam();
  const router = useRouter();
  const photo = useRef<Blob | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  return <div className="space-y-6">
    <p>{questionCount} preguntas · {durationMinutes} minutos · Intentos ilimitados. El reloj comienza después de guardar la foto y registrar el intento.</p>
    <WebcamPanel camera={camera} />
    <label className="flex items-start gap-3"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 size-5 shrink-0" /><span>Entiendo que se guardará una foto al inicio de este intento y que debo mantener la cámara activa mientras respondo.</span></label>
    <Button disabled={!camera.ready || !accepted} isPending={pending} pendingLabel="Guardando foto e iniciando…" onClick={() => {
      if (!accepted || !camera.isLive()) return;
      setError('');
      startTransition(async () => {
        try {
          photo.current ??= await camera.capture();
          if (!camera.isLive()) throw new Error('La cámara se apagó. Reactivala antes de comenzar.');
          const form = new FormData(); form.set('photo', photo.current, 'foto-inicial.jpg');
          const response = await beginExamWithPhoto(courseId, quizId, form);
          if (!response.success) { setError(response.error); return; }
          router.push(`/estudiantes/cursos/${courseId}/preparacion/intentos/${response.id}`);
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos iniciar el examen.'); }
      });
    }}>Tomar foto e iniciar examen</Button>
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
  </div>;
}
