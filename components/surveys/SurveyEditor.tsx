'use client';

import { useRef, useState, useTransition, type SetStateAction } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardContent, Field } from '@/components/ui';
import { saveSurvey } from '@/lib/actions-course-surveys';
import { surveyDesignSchema, surveyQuestionLabels, type CourseSurvey, type SurveyDesign, type SurveyQuestion } from '@/lib/course-surveys';
import { surveyControl } from './styles';

const newId = () => crypto.randomUUID().replaceAll('-', '');
function newQuestion(): SurveyQuestion { return { id: newId(), title: '', type: 'single', required: true, options: [{ id: newId(), label: '' }, { id: newId(), label: '' }] }; }
function localDate(iso: string) {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function SurveyEditor({ courseId, base, survey, onDirtyChange }: { courseId: string; base: string; survey?: CourseSurvey; onDirtyChange?: (dirty: boolean) => void }) {
  const router = useRouter();
  const [design, setDesignState] = useState<SurveyDesign>(() => survey ? { title: survey.title, description: survey.description, anonymous: survey.anonymous, closesAt: survey.closesAt, questions: survey.questions } : { title: '', description: '', anonymous: false, closesAt: '', questions: [] });
  const [date, setDate] = useState(() => localDate(survey?.closesAt || ''));
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const feedback = useRef<HTMLDivElement>(null);
  function setDesign(value: SetStateAction<SurveyDesign>) { onDirtyChange?.(true); setDesignState(value); }
  function fail(message: string) { setError(message); requestAnimationFrame(() => feedback.current?.focus()); }
  function updateQuestion(index: number, patch: Partial<SurveyQuestion>) {
    setDesign(d => ({ ...d, questions: d.questions.map((q, i) => i === index ? { ...q, ...patch } : q) }));
  }
  function move(index: number, direction: number) {
    setDesign(d => { const questions = [...d.questions]; [questions[index], questions[index + direction]] = [questions[index + direction], questions[index]]; return { ...d, questions }; });
  }
  function save() {
    const parsedDate = date ? new Date(date) : null;
    if (parsedDate && Number.isNaN(parsedDate.getTime())) return fail('Elegí una fecha de cierre válida.');
    const parsed = surveyDesignSchema.safeParse({ ...design, closesAt: parsedDate?.toISOString() || '' });
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    setError('');
    startTransition(async () => {
      try {
        const result = await saveSurvey(courseId, survey?.id || null, survey?.revision || '', parsed.data);
        if (!result.success) return fail(result.error);
        onDirtyChange?.(false);
        router.push(`${base}/${result.id}`);
        router.refresh();
      } catch { fail('No pudimos guardar el borrador. Intentá nuevamente.'); }
    });
  }
  return <form className="space-y-6" onSubmit={e => { e.preventDefault(); save(); }}>
    <p className="text-sm text-[var(--color-on-surface-variant)]">Guardá el borrador y revisá las preguntas antes de publicar. Podrás editarlas mientras la encuesta siga en borrador.</p>
    {error && <div ref={feedback} tabIndex={-1} role="alert" className="rounded-xl border border-[var(--color-error)] p-4 text-[var(--color-error)]">{error}</div>}
    <fieldset disabled={pending} className="space-y-6">
      <Card><CardContent className="space-y-5">
        <Field label="Título de la encuesta" required><input className={surveyControl} maxLength={160} value={design.title} onChange={e => setDesign({ ...design, title: e.target.value })} /></Field>
        <Field label="Descripción" hint="Explicá para qué se usarán las respuestas."><textarea className={surveyControl} rows={3} maxLength={3000} value={design.description} onChange={e => setDesign({ ...design, description: e.target.value })} /></Field>
        <Field label="Privacidad de las respuestas" hint="La modalidad queda fija al publicar."><select className={surveyControl} value={design.anonymous ? 'anonymous' : 'identified'} onChange={e => setDesign({ ...design, anonymous: e.target.value === 'anonymous' })}><option value="identified">Identificadas: se muestra el nombre del alumno</option><option value="anonymous">Anónimas: resultados sin nombres ni respuestas vinculadas</option></select></Field>
        <Field label="Fecha de cierre (opcional)" hint="Se usa la zona horaria de tu dispositivo. Si la dejás vacía, podrás cerrar la encuesta manualmente."><input type="datetime-local" className={surveyControl} value={date} onChange={e => { onDirtyChange?.(true); setDate(e.target.value); }} /></Field>
      </CardContent></Card>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Preguntas ({design.questions.length}/40)</h2><Button variant="secondary" disabled={design.questions.length >= 40} onClick={() => setDesign(d => ({ ...d, questions: [...d.questions, newQuestion()] }))}>Agregar pregunta</Button></div>
      {!design.questions.length && <p className="rounded-xl border border-dashed border-[var(--color-outline)] p-6 text-center text-[var(--color-on-surface-variant)]">Agregá la primera pregunta para comenzar.</p>}
      {design.questions.map((q, index) => <Card key={q.id}><CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Pregunta {index + 1}</h3><div className="flex flex-wrap gap-1">
          <Button variant="ghost" disabled={!index} aria-label={`Subir pregunta ${index + 1}`} onClick={() => move(index, -1)}>↑ Subir</Button>
          <Button variant="ghost" disabled={index === design.questions.length - 1} aria-label={`Bajar pregunta ${index + 1}`} onClick={() => move(index, 1)}>↓ Bajar</Button>
          <Button variant="ghost" aria-label={`Quitar pregunta ${index + 1}`} onClick={() => setDesign(d => ({ ...d, questions: d.questions.filter(item => item.id !== q.id) }))}>Quitar</Button>
        </div></div>
        <Field label={`Enunciado de la pregunta ${index + 1}`} required><input className={surveyControl} maxLength={500} value={q.title} onChange={e => updateQuestion(index, { title: e.target.value })} /></Field>
        <Field label={`Tipo de la pregunta ${index + 1}`}><select className={surveyControl} value={q.type} onChange={e => {
          const type = e.target.value as SurveyQuestion['type'];
          updateQuestion(index, { type, options: type === 'single' || type === 'multiple' ? q.options.length ? q.options : newQuestion().options : [] });
        }}>{Object.entries(surveyQuestionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-5" checked={q.required} onChange={e => updateQuestion(index, { required: e.target.checked })} />Respuesta obligatoria</label>
        {(q.type === 'single' || q.type === 'multiple') && <fieldset className="space-y-3"><legend className="mb-3 font-bold">Opciones</legend>
          {q.options.map((o, optionIndex) => <div key={o.id} className="flex items-end gap-2"><Field label={`Opción ${optionIndex + 1} de la pregunta ${index + 1}`} required className="flex-1"><input className={surveyControl} maxLength={300} value={o.label} onChange={e => updateQuestion(index, { options: q.options.map(item => item.id === o.id ? { ...item, label: e.target.value } : item) })} /></Field><Button variant="ghost" aria-label={`Quitar opción ${optionIndex + 1} de la pregunta ${index + 1}`} disabled={q.options.length <= 2} onClick={() => updateQuestion(index, { options: q.options.filter(item => item.id !== o.id) })}>Quitar</Button></div>)}
          <Button variant="secondary" disabled={q.options.length >= 20} onClick={() => updateQuestion(index, { options: [...q.options, { id: newId(), label: '' }] })}>Agregar opción</Button>
        </fieldset>}
        {q.type === 'scale' && <p className="text-sm text-[var(--color-on-surface-variant)]">El alumno elegirá un valor de 1 a 5. Aclará en el enunciado qué representan los extremos.</p>}
        {q.type === 'text' && <p className="text-sm text-[var(--color-on-surface-variant)]">Respuesta de hasta 3000 caracteres.</p>}
      </CardContent></Card>)}
      <div className="flex flex-wrap items-center gap-4"><Button type="submit" isPending={pending} pendingLabel="Guardando…">Guardar borrador</Button><Link href={base} className="inline-flex min-h-11 items-center font-bold text-[var(--color-primary)]">Volver a encuestas</Link></div>
    </fieldset>
  </form>;
}
