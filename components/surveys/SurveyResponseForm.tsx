'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { respondSurvey } from '@/lib/actions-course-surveys';
import { parseSurveyAnswers, surveyIsOpen, type CourseSurvey, type SurveyAnswers } from '@/lib/course-surveys';
import { surveyControl } from './styles';

export function SurveyResponseForm({ survey, submitted }: { survey: CourseSurvey; submitted: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [sent, setSent] = useState(submitted);
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [pending, startTransition] = useTransition();
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!survey.closesAt) return;
    const check = () => setExpired(Date.now() >= Date.parse(survey.closesAt));
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [survey.closesAt]);
  if (sent || submitted) return <Card><CardContent><div role="status" className="space-y-2"><h2 className="text-xl font-bold">Tu respuesta fue enviada</h2><p className="text-[var(--color-on-surface-variant)]">Gracias por participar. Se registró una única respuesta y ya no se puede modificar.</p></div></CardContent></Card>;
  if (expired || !surveyIsOpen(survey)) return <Card><CardContent><h2 className="text-xl font-bold">Encuesta cerrada</h2><p className="mt-2 text-[var(--color-on-surface-variant)]">Ya no se reciben respuestas.</p></CardContent></Card>;
  function fail(message: string) { setError(message); requestAnimationFrame(() => feedback.current?.focus()); }
  function send() {
    let input: SurveyAnswers;
    try { input = parseSurveyAnswers(survey.questions, answers); }
    catch (e) { return fail(e instanceof Error ? e.message : 'Revisá las respuestas.'); }
    setError('');
    startTransition(async () => {
      try {
        const result = await respondSurvey(survey.course, survey.id, input);
        if (!result.success) return fail(result.error);
        setSent(true);
        router.refresh();
      } catch { fail('No pudimos confirmar el envío. Intentá nuevamente; no se duplicará tu respuesta.'); }
    });
  }
  return <form className="space-y-6" onSubmit={e => { e.preventDefault(); send(); }}>
    <p className="rounded-xl bg-[var(--color-surface-container-high)] p-4 text-sm">{survey.anonymous ? 'Encuesta anónima. Los resultados no muestran tu nombre ni vinculan tus respuestas entre preguntas. Evitá escribir datos que te identifiquen en los textos.' : 'Encuesta identificada. El equipo docente y la administración podrán ver tu nombre junto con tus respuestas.'} Podés responder una sola vez.</p>
    {error && <div ref={feedback} role="alert" tabIndex={-1} className="rounded-xl border border-[var(--color-error)] p-4 text-[var(--color-error)]">{error}</div>}
    <fieldset disabled={pending} className="space-y-5">
      {survey.questions.map((q, index) => <Card key={q.id}><CardContent><fieldset className="space-y-3"><legend className="mb-3 break-words font-bold">{index + 1}. {q.title} <span className="text-sm font-normal text-[var(--color-on-surface-variant)]">({q.required ? 'obligatoria' : 'opcional'})</span></legend>
        {q.type === 'text' ? <textarea aria-label={q.title} className={surveyControl} rows={4} maxLength={3000} required={q.required} value={String(answers[q.id] || '')} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })} />
          : q.type === 'scale' ? <div className="grid max-w-md grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map(value => <label key={value} className="flex min-h-12 min-w-0 cursor-pointer items-center justify-center gap-1 rounded-xl border border-[var(--color-outline)] px-1"><input type="radio" name={q.id} value={value} required={q.required} checked={answers[q.id] === value} onChange={() => setAnswers({ ...answers, [q.id]: value })} />{value}</label>)}</div>
          : q.options.map(o => <label key={o.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[var(--color-outline-variant)] px-4 py-3"><input type={q.type === 'single' ? 'radio' : 'checkbox'} name={q.id} value={o.id} className="size-5 shrink-0" required={q.type === 'single' && q.required} checked={q.type === 'single' ? answers[q.id] === o.id : Array.isArray(answers[q.id]) && (answers[q.id] as string[]).includes(o.id)} onChange={e => {
            if (q.type === 'single') setAnswers({ ...answers, [q.id]: o.id });
            else { const current = Array.isArray(answers[q.id]) ? answers[q.id] as string[] : []; setAnswers({ ...answers, [q.id]: e.target.checked ? [...current, o.id] : current.filter(id => id !== o.id) }); }
          }} /><span className="break-words">{o.label}</span></label>)}
        {!q.required && (q.type === 'single' || q.type === 'scale') && <Button variant="ghost" onClick={() => setAnswers(current => { const next = { ...current }; delete next[q.id]; return next; })}>Limpiar respuesta</Button>}
      </fieldset></CardContent></Card>)}
      <p className="text-sm text-[var(--color-on-surface-variant)]">Revisá tus respuestas antes de enviar. Después del envío no podrás modificarlas.</p>
      <Button type="submit" isPending={pending} pendingLabel="Enviando…">Enviar respuestas</Button>
    </fieldset>
  </form>;
}
