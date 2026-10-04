'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent } from '@/components/ui';
import { savePracticeQuiz } from '@/lib/actions-preparation';
import { practiceQuizSchema, type PracticeQuiz, type PracticeQuizInput, type PracticeQuestion } from '@/lib/preparation';

const field = 'mt-2 w-full rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-3 text-[var(--color-on-surface)]';
const newQuestion = (): PracticeQuestion => { const options = Array.from({ length: 4 }, () => ({ id: crypto.randomUUID(), label: '' })); return { id: crypto.randomUUID(), prompt: '', options, correctOptionId: options[0].id, explanation: '' }; };

export function QuizEditor({ courseId, quiz }: { courseId: string; quiz: PracticeQuiz | null }) {
  const router = useRouter();
  const [title, setTitle] = useState(quiz?.title || '');
  const [description, setDescription] = useState(quiz?.description || '');
  const [questions, setQuestions] = useState<PracticeQuestion[]>(quiz?.questions || []);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const update = (id: string, data: Partial<PracticeQuestion>) => setQuestions(items => items.map(q => q.id === id ? { ...q, ...data } : q));
  const move = (index: number, offset: number) => setQuestions(items => { const next = [...items]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next; });
  const save = (status: PracticeQuizInput['status']) => {
    const parsed = practiceQuizSchema.safeParse({ title, description, questions, status });
    if (!parsed.success) { setError(parsed.error.issues[0].message); return; }
    if (status === 'archived' && !window.confirm('¿Archivar esta práctica? Se conservarán los intentos y dejará de admitir prácticas nuevas.')) return;
    setError(''); startTransition(async () => {
      const result = await savePracticeQuiz(courseId, quiz?.id || null, parsed.data);
      if (!result.success) { setError(result.error); return; }
      router.push(`/docentes/cursos/${courseId}/preparacion`); router.refresh();
    });
  };
  return <form className="space-y-6" onSubmit={e => { e.preventDefault(); save(quiz?.status === 'published' ? 'published' : 'draft'); }}>
    <fieldset disabled={pending} className="space-y-6">
      <Card><CardContent className="space-y-5">
        <label className="block font-semibold">Título<input className={field} value={title} maxLength={160} onChange={e => setTitle(e.target.value)} required /></label>
        <label className="block font-semibold">Instrucciones para el alumno<textarea className={field} rows={3} value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} /></label>
        <p className="text-sm text-[var(--color-text-muted)]">Una respuesta correcta por pregunta. Intentos ilimitados y devolución al finalizar. Los resultados son de práctica y no modifican notas oficiales.</p>
      </CardContent></Card>
      {questions.map((q, index) => <Card key={q.id}><CardContent className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Pregunta {index + 1}</h2><div className="flex flex-wrap gap-2">
          <Button variant="ghost" disabled={index === 0} aria-label={`Subir pregunta ${index + 1}`} onClick={() => move(index, -1)}>Subir</Button>
          <Button variant="ghost" disabled={index === questions.length - 1} aria-label={`Bajar pregunta ${index + 1}`} onClick={() => move(index, 1)}>Bajar</Button>
          <Button variant="ghost" aria-label={`Eliminar pregunta ${index + 1}`} onClick={() => { if (window.confirm('¿Eliminar esta pregunta del editor?')) setQuestions(items => items.filter(item => item.id !== q.id)); }}>Eliminar</Button>
        </div></div>
        <label className="block font-semibold">Enunciado de la pregunta {index + 1}<textarea className={field} rows={3} maxLength={4000} required value={q.prompt} onChange={e => update(q.id, { prompt: e.target.value })} /></label>
        <fieldset className="space-y-3"><legend className="mb-2 font-semibold">Opciones y respuesta correcta</legend>
          {q.options.map((option, oi) => <div key={option.id} className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name={`correct-${q.id}`} checked={q.correctOptionId === option.id} onChange={() => update(q.id, { correctOptionId: option.id })} aria-label={`Marcar opción ${oi + 1} como correcta en pregunta ${index + 1}`} />Correcta</label>
            <input aria-label={`Opción ${oi + 1} de pregunta ${index + 1}`} className={`${field} !mt-0 min-w-40 flex-1`} value={option.label} maxLength={500} required onChange={e => update(q.id, { options: q.options.map(o => o.id === option.id ? { ...o, label: e.target.value } : o) })} />
            <Button variant="ghost" disabled={q.options.length <= 2} aria-label={`Quitar opción ${oi + 1} de pregunta ${index + 1}`} onClick={() => { const options = q.options.filter(o => o.id !== option.id); update(q.id, { options, correctOptionId: q.correctOptionId === option.id ? options[0].id : q.correctOptionId }); }}>Quitar</Button>
          </div>)}
          <Button variant="secondary" disabled={q.options.length >= 8} onClick={() => update(q.id, { options: [...q.options, { id: crypto.randomUUID(), label: '' }] })}>Agregar opción</Button>
        </fieldset>
        <label className="block font-semibold">Explicación de la pregunta {index + 1}<textarea className={field} rows={3} maxLength={4000} value={q.explanation} onChange={e => update(q.id, { explanation: e.target.value })} /><span className="mt-1 block text-sm font-normal text-[var(--color-text-muted)]">Se mostrará cuando el alumno termine. Podés explicar el razonamiento y qué revisar.</span></label>
      </CardContent></Card>)}
      <Button variant="secondary" disabled={questions.length >= 80} onClick={() => setQuestions(items => [...items, newQuestion()])}>Agregar pregunta</Button>
      <p className="text-sm text-[var(--color-text-muted)]">{questions.length} de 80 preguntas. Los cambios no afectan los intentos que ya se iniciaron.</p>
      {error && <p role="alert" className="text-[var(--color-error)]">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" isPending={pending}>{quiz?.status === 'published' ? 'Guardar cambios publicados' : 'Guardar borrador'}</Button>
        {quiz?.status !== 'published' && <Button disabled={!questions.length} onClick={() => save('published')}>Publicar práctica</Button>}
        {quiz?.status === 'published' && <Button variant="secondary" onClick={() => save('draft')}>Volver a borrador</Button>}
        {quiz && quiz.status !== 'archived' && <Button variant="ghost" onClick={() => save('archived')}>Archivar</Button>}
      </div>
    </fieldset>
  </form>;
}
