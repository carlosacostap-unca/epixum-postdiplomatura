'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button, Card, CardContent } from '@/components/ui';
import { submitPractice, submitPracticeAnswer } from '@/lib/actions-preparation';
import type { PracticeResult, PublicPracticeQuestion } from '@/lib/preparation';
import { PracticeReview } from './PracticeReview';
import { reportExamCamera } from '@/lib/actions-exam-camera';
import { useWebcam } from './useWebcam';
import { WebcamPanel } from './WebcamPanel';
import Link from 'next/link';

export function ExamRunner({ courseId, quizId, attemptId, questions, initialSelected, initialResult, deadline, serverNow }: {
  courseId: string; quizId: string; attemptId: string; questions: PublicPracticeQuestion[];
  initialSelected: Record<string, string>; initialResult: PracticeResult | null;
  deadline: string; serverNow: number;
}) {
  const [selected, setSelected] = useState(initialSelected);
  const [result, setResult] = useState(initialResult);
  const camera = useWebcam(!result, true);
  const { isLive: isCameraLive, ready: cameraReady } = camera;
  const [cameraVerified, setCameraVerified] = useState(false);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [elapsed, setElapsed] = useState(0);
  const clock = useRef<number | null>(null);
  const startedServerNow = useRef(serverNow);
  const lastAutoSubmit = useRef(-Infinity);
  const remaining = Math.max(0, Math.ceil((Date.parse(deadline) - startedServerNow.current - elapsed) / 1000));

  useEffect(() => {
    if (result) return;
    let cancelled = false;
    let reporting = false;
    const report = async () => {
      if (reporting) return;
      reporting = true;
      try {
        const response = await reportExamCamera(courseId, attemptId, isCameraLive());
        if (!cancelled) setCameraVerified(response.success && response.active && isCameraLive());
      } catch { if (!cancelled) setCameraVerified(false); }
      finally { reporting = false; }
    };
    void report();
    const heartbeat = window.setInterval(() => { void report(); }, 8000);
    return () => { cancelled = true; window.clearInterval(heartbeat); };
  }, [cameraReady, isCameraLive, courseId, attemptId, result]);

  useEffect(() => {
    if (result) return;
    clock.current ??= performance.now();
    const tick = () => setElapsed(performance.now() - clock.current!);
    tick();
    const timer = window.setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', tick); };
  }, [result]);

  useEffect(() => {
    if (result || remaining > 0 || pending || elapsed - lastAutoSubmit.current < 5000) return;
    lastAutoSubmit.current = elapsed;
    startTransition(async () => {
      const response = await submitPractice(courseId, attemptId);
      if (response.success) { setResult(response.result); setError(''); }
      else setError(response.error);
    });
  }, [remaining, result, pending, elapsed, courseId, attemptId]);

  if (result) return <div className="space-y-6"><PracticeReview result={result} /><Link href={`/estudiantes/cursos/${courseId}/preparacion/iniciar/${quizId}`} className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-primary)] px-5 py-2 font-bold text-[var(--color-on-primary)]">Iniciar otra simulación</Link><p className="text-sm text-[var(--color-text-muted)]">Podés repetirla cuantas veces quieras. Cada intento conserva su foto inicial y su resultado en el historial.</p></div>;
  const question = questions[index];
  if (!question) return <p>No hay preguntas en este intento.</p>;
  const confirmed = selected[question.id];
  const navigate = (next: number) => { setIndex(next); setChoice(''); };
  return <div className="space-y-5">
    <Card><CardContent className="space-y-3">
      <p role="timer" aria-label="Tiempo restante" className="text-3xl font-bold text-[var(--color-primary)]">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</p>
      <p>{remaining ? 'El tiempo continúa aunque salgas o cierres esta página.' : 'Tiempo agotado. Se está cerrando el examen con las respuestas guardadas.'}</p>
      <p>Pregunta {index + 1} de {questions.length} · {Object.keys(selected).length} respuestas guardadas</p>
    </CardContent></Card>
    <WebcamPanel camera={camera} />
    {camera.ready && !cameraVerified && <p role="status">Verificando la conexión de la cámara. Esperá para confirmar respuestas.</p>}
    <nav aria-label="Preguntas del examen" className="flex flex-wrap gap-2">{questions.map((q, i) => <Button key={q.id} variant={i === index ? 'primary' : 'secondary'} onClick={() => navigate(i)} aria-current={i === index ? 'step' : undefined} aria-label={`Pregunta ${i + 1}${selected[q.id] ? ', respondida' : ', sin responder'}`}>{i + 1}{selected[q.id] ? ' ✓' : ''}</Button>)}</nav>
    <form onSubmit={e => {
      e.preventDefault();
      if (!choice || confirmed || !remaining || !cameraVerified || !camera.isLive()) return;
      setError('');
      startTransition(async () => {
        const response = await submitPracticeAnswer(courseId, attemptId, question.id, choice);
        if (!response.success) { setError(response.error); return; }
        setSelected(response.attempt.selected); setResult(response.attempt.result);
      });
    }}>
      <Card><CardContent><fieldset disabled={pending || !!confirmed || !remaining || !camera.ready || !cameraVerified} className="space-y-4">
        <legend className="mb-4 whitespace-pre-wrap text-lg font-bold">{question.prompt}</legend>
        {question.options.map(o => <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-outline-variant)] p-4"><input type="radio" name={question.id} checked={(confirmed || choice) === o.id} onChange={() => setChoice(o.id)} className="mt-1 size-4 shrink-0" /><span className="whitespace-pre-wrap">{o.label}</span></label>)}
        <p className="text-sm text-[var(--color-text-muted)]">{confirmed ? 'Respuesta guardada. La corrección estará disponible al finalizar.' : 'Al confirmar, la respuesta queda guardada y no se puede cambiar. Una selección sin confirmar no se guarda.'}</p>
        {!confirmed && <Button type="submit" disabled={!choice || !remaining || !camera.ready || !cameraVerified} isPending={pending}>Confirmar respuesta</Button>}
      </fieldset></CardContent></Card>
    </form>
    <div className="flex flex-wrap gap-3">
      {index > 0 && <Button variant="secondary" onClick={() => navigate(index - 1)}>Pregunta anterior</Button>}
      {index < questions.length - 1 && <Button variant="secondary" onClick={() => navigate(index + 1)}>Siguiente pregunta</Button>}
      <Button isPending={pending} onClick={() => {
        if (remaining && !window.confirm(`¿Entregar el examen? Hay ${questions.length - Object.keys(selected).length} preguntas sin responder. Contarán como incorrectas.`)) return;
        setError('');
        startTransition(async () => {
          const response = await submitPractice(courseId, attemptId);
          if (response.success) setResult(response.result); else setError(response.error);
        });
      }}>Entregar examen</Button>
    </div>
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
    <p className="text-sm text-[var(--color-text-muted)]">{questions.length === 20 ? 'Cada respuesta correcta suma 0,5 puntos.' : 'Todas las preguntas valen lo mismo.'} Las incorrectas y sin responder suman cero y no restan puntos. La nota simulada va de 0 a 10 y no modifica tus notas oficiales.</p>
  </div>;
}
