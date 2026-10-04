'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { beginPractice, submitPractice, submitPracticeAnswer } from '@/lib/actions-preparation';
import type { PracticeResult, PracticeReview as ReviewItem, PublicPracticeQuestion } from '@/lib/preparation';
import { PracticeReview, QuestionFeedback } from './PracticeReview';

export function BeginPracticeButton({ courseId, quizId }: { courseId: string; quizId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return <div><Button isPending={pending} onClick={() => {
    setError('');
    startTransition(async () => {
      const result = await beginPractice(courseId, quizId);
      if (!result.success) setError(result.error);
      else router.push(`/estudiantes/cursos/${courseId}/preparacion/intentos/${result.id}`);
    });
  }}>Comenzar o continuar</Button>{error && <p role="alert" className="mt-3 text-[var(--color-error)]">{error}</p>}</div>;
}

export function PracticeRunner({ courseId, quizId, attemptId, questions, initialFeedback, initialResult }: {
  courseId: string; quizId: string; attemptId: string; questions: PublicPracticeQuestion[];
  initialFeedback: ReviewItem[]; initialResult: PracticeResult | null;
}) {
  const router = useRouter();
  const [feedback, setFeedback] = useState(initialFeedback);
  const [result, setResult] = useState(initialResult);
  const [showSummary, setShowSummary] = useState(!!initialResult);
  const [resumePrompt, setResumePrompt] = useState(!initialResult && initialFeedback.length > 0);
  const [index, setIndex] = useState(Math.min(initialFeedback.length, questions.length - 1));
  const [selection, setSelection] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const question = questions[index];
  const currentFeedback = feedback.find(f => f.question.id === question?.id);
  const goTo = (next: number) => { setIndex(next); setSelection(''); setError(''); };

  const restart = () => {
    setError('');
    startTransition(async () => {
      const response = await beginPractice(courseId, quizId, true);
      if (!response.success) { setError(response.error); return; }
      router.push(`/estudiantes/cursos/${courseId}/preparacion/intentos/${response.id}`);
    });
  };

  if (showSummary && result) return <PracticeReview result={result} />;
  if (resumePrompt) return <Card><CardContent className="space-y-5">
    <h2 className="text-xl font-bold">Tenés una práctica en curso</h2>
    <p>Guardaste {feedback.length} de {questions.length} respuestas. Podés continuar {feedback.length < questions.length ? `desde la pregunta ${feedback.length + 1}` : 'para ver el resumen final'} o empezar de cero. El intento anterior se conserva en tu historial.</p>
    <div className="flex flex-wrap gap-3">
      <Button disabled={pending} onClick={() => setResumePrompt(false)}>Continuar donde quedé</Button>
      <Button variant="secondary" isPending={pending} onClick={restart}>Empezar de cero</Button>
    </div>
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
  </CardContent></Card>;
  if (!question) return <p>No hay preguntas en este intento.</p>;

  return <div className="space-y-5">
    <p className="rounded-xl bg-[var(--color-surface-container)] p-4" aria-live="polite">Pregunta {index + 1} de {questions.length} · Respuestas guardadas: {feedback.length}</p>
    {currentFeedback ? <section aria-label="Devolución de la pregunta" className="space-y-4">
      <p role="status">Respuesta guardada. Revisá la explicación antes de avanzar; podés consultar tus apuntes.</p>
      <QuestionFeedback item={currentFeedback} index={index} />
    </section> : <form onSubmit={e => {
      e.preventDefault();
      if (!selection) return;
      setError('');
      startTransition(async () => {
        const response = await submitPracticeAnswer(courseId, attemptId, question.id, selection);
        if (!response.success) { setError(response.error); return; }
        setFeedback(response.attempt.feedback);
        setResult(response.attempt.result);
      });
    }}>
      <fieldset disabled={pending} className="space-y-5">
        <Card><CardContent><fieldset>
          <legend className="mb-4 whitespace-pre-wrap text-lg font-bold">{question.prompt}</legend>
          <div className="space-y-3">{question.options.map(o => <label key={o.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-outline-variant)] p-4 hover:bg-[var(--color-surface-container)]">
            <input className="mt-1 size-4 shrink-0" type="radio" name={question.id} value={o.id} checked={selection === o.id} onChange={() => setSelection(o.id)} />
            <span className="whitespace-pre-wrap">{o.label}</span>
          </label>)}</div>
        </fieldset></CardContent></Card>
        <p className="text-sm text-[var(--color-text-muted)]">Al confirmar, tu respuesta se guarda en tu cuenta y se muestra la explicación. No podrás cambiarla en este intento. Si salís antes de confirmar, esa selección no se guarda.</p>
        <Button type="submit" disabled={!selection} isPending={pending}>Confirmar respuesta</Button>
      </fieldset>
    </form>}
    {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
    <div className="flex flex-wrap gap-3">
      {index > 0 && <Button variant="secondary" disabled={pending} onClick={() => goTo(index - 1)}>Pregunta anterior</Button>}
      {currentFeedback && index < questions.length - 1 && <Button disabled={pending} onClick={() => goTo(index + 1)}>Siguiente pregunta</Button>}
      {currentFeedback && index === questions.length - 1 && <Button isPending={pending} onClick={() => {
        if (result) { setShowSummary(true); return; }
        setError('');
        startTransition(async () => {
          const response = await submitPractice(courseId, attemptId);
          if (!response.success) { setError(response.error); return; }
          setResult(response.result); setShowSummary(true);
        });
      }}>Ver resumen final</Button>}
    </div>
    <p className="text-sm text-[var(--color-text-muted)]">Podés salir y continuar desde otro dispositivo con la misma cuenta. Tus respuestas confirmadas quedan disponibles para el equipo docente. Esta práctica no modifica tus notas oficiales.</p>
  </div>;
}
