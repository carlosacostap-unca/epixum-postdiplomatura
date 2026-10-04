'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { beginPractice, submitPractice } from '@/lib/actions-preparation';
import type { PracticeResult, PublicPracticeQuestion } from '@/lib/preparation';
import { PracticeReview } from './PracticeReview';

export function BeginPracticeButton({ courseId, quizId }: { courseId: string; quizId: string }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [error, setError] = useState('');
  return <div><Button isPending={pending} onClick={() => { setError(''); startTransition(async () => { const result = await beginPractice(courseId, quizId); if (!result.success) setError(result.error); else router.push(`/estudiantes/cursos/${courseId}/preparacion/intentos/${result.id}`); }); }}>Comenzar práctica</Button>{error && <p role="alert" className="mt-3 text-[var(--color-error)]">{error}</p>}</div>;
}

export function PracticeRunner({ courseId, attemptId, questions, initialResult }: { courseId: string; attemptId: string; questions: PublicPracticeQuestion[]; initialResult: PracticeResult | null }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState(initialResult);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const storageKey = `practice:${attemptId}`;
  useEffect(() => {
    let restored: Record<string, string> = {};
    try {
      const data = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
      for (const q of questions) if (q.options.some(o => o.id === data[q.id])) restored[q.id] = data[q.id];
    } catch { restored = {}; }
    // Hydrate tab-local selections after mount; never serialize them from the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswers(restored);
    setLoaded(true);
  }, [storageKey, questions]);
  const select = (id: string, value: string) => {
    const next = { ...answers, [id]: value }; setAnswers(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Private browsing can disable storage; answering still works. */ }
  };
  if (result) return <PracticeReview result={result} />;
  const answered = Object.keys(answers).length;
  return <form className="space-y-5" onSubmit={e => {
    e.preventDefault();
    if (!window.confirm(answered < questions.length ? `Quedan ${questions.length - answered} preguntas sin responder y contarán como incorrectas. ¿Finalizar?` : '¿Finalizar y ver la corrección? No podrás cambiar este intento.')) return;
    setError(''); startTransition(async () => {
      const response = await submitPractice(courseId, attemptId, answers);
      if (!response.success) { setError(response.error); return; }
      setResult(response.result); try { sessionStorage.removeItem(storageKey); } catch { /* No persistent browser storage required. */ }
    });
  }}>
    <p className="rounded-xl bg-[var(--color-surface-container)] p-4" aria-live="polite">{answered} de {questions.length} respondidas · Una opción por pregunta. La corrección aparece al finalizar.</p>
    <fieldset disabled={pending || !loaded} className="space-y-5">
      {questions.map((q, i) => <Card key={q.id}><CardContent><fieldset>
        <legend className="mb-4 whitespace-pre-wrap text-lg font-bold">{i + 1}. {q.prompt}</legend>
        <div className="space-y-3">{q.options.map(o => <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-outline-variant)] p-4 hover:bg-[var(--color-surface-container)]"><input className="mt-1 size-4 shrink-0" type="radio" name={q.id} value={o.id} checked={answers[q.id] === o.id} onChange={() => select(q.id, o.id)} /><span className="whitespace-pre-wrap">{o.label}</span></label>)}</div>
      </fieldset></CardContent></Card>)}
      {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
      <p className="text-sm text-[var(--color-text-muted)]">Podés volver a practicar sin límite. Tus respuestas y resultados quedan disponibles para el equipo docente. Las selecciones pendientes se conservan en esta pestaña hasta enviarlas.</p>
      <Button type="submit" isPending={pending}>Finalizar y ver corrección</Button>
    </fieldset>
  </form>;
}
