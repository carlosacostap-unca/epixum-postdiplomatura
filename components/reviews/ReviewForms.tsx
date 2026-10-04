'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ZodError } from 'zod';
import { generateReviewSlots, reviewDate, type Review, type ReviewBlock, type ReviewBlockInput } from '@/lib/review-appointments';
import { saveReviewAction, saveReviewBlockAction, evaluateReviewAction } from '@/lib/actions-review-appointments';

export const reviewButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-2 text-sm font-bold text-[var(--color-on-primary)] disabled:cursor-not-allowed disabled:opacity-50';
export const reviewSecondary = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-outline)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-surface-container-high)] disabled:opacity-50';
export const reviewInput = 'mt-2 block min-h-11 w-full rounded-xl border border-[var(--color-outline)] bg-[var(--color-surface-container-lowest)] px-3 py-2 text-[var(--color-on-surface)]';
export const reviewPanel = 'rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] p-5 md:p-6';

type Result = { success: true; id?: string | void } | { success: false; error: string };
export function useReviewMutation() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  function run(operation: () => Promise<Result>, done?: (id?: string | void) => void) {
    setError(''); setNotice('');
    start(async () => {
      try {
        const result = await operation();
        if (!result.success) setError(result.error);
        else { setNotice('Cambios guardados.'); done?.(result.id); }
        router.refresh();
      } catch { setError('No se pudo confirmar la operación. Actualizá la página para revisar el estado.'); }
    });
  }
  return { pending, run, feedback: <>{error && <p role="alert" className="rounded-xl border border-[var(--color-error)] p-4 text-sm text-[var(--color-error)]">{error}</p>}{notice && <p role="status" className="text-sm text-[var(--color-primary)]">{notice}</p>}</> };
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block min-w-0 text-sm font-semibold">{label}{children}</label>;
}

export function ReviewEditor({ courseId, review, nextNumber = 1 }: { courseId: string; review?: Review; nextNumber?: number }) {
  const router = useRouter(); const mutation = useReviewMutation();
  return <form className="space-y-4" onSubmit={e => {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    mutation.run(() => saveReviewAction(courseId, review?.id || null, review?.revision || '', {
      number: review?.number ?? Number(form.get('number')), title: form.get('title'), instructions: form.get('instructions'), open: form.get('open') === 'on',
    }), id => { if (!review && id) router.push(`/docentes/cursos/${courseId}/revisiones/${id}`); });
  }}>
    <fieldset disabled={mutation.pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
        <Field label="Número"><input className={reviewInput} name="number" type="number" min={1} max={9999} required readOnly={Boolean(review)} defaultValue={review?.number ?? nextNumber} /></Field>
        <Field label="Título"><input className={reviewInput} name="title" maxLength={160} required defaultValue={review?.title} placeholder="Por ejemplo: Revisión de avances" /></Field>
      </div>
      <Field label="Instrucciones para los alumnos"><textarea className={reviewInput} name="instructions" rows={3} maxLength={4000} defaultValue={review?.instructions} placeholder="Qué preparar, dónde encontrarse o enlace de la reunión…" /></Field>
      <label className="flex items-center gap-3 text-sm"><input className="size-5" type="checkbox" name="open" defaultChecked={review?.open ?? true} />Abierta para reservar turnos</label>
      <p className="text-xs text-[var(--color-text-muted)]">Cerrar las reservas conserva los turnos existentes y permite cancelarlos antes de su inicio.</p>
      <button className={reviewButton} type="submit">{mutation.pending ? 'Guardando…' : review ? 'Guardar revisión' : 'Crear revisión'}</button>
    </fieldset>{mutation.feedback}
  </form>;
}

export function ReviewBlockEditor({ courseId, review, teachers, block, onDone }: { courseId: string; review: Review; teachers: { id: string; name: string }[]; block?: ReviewBlock; onDone: () => void }) {
  const mutation = useReviewMutation();
  const [preview, setPreview] = useState<{ input: ReviewBlockInput; plan: ReturnType<typeof generateReviewSlots> } | null>(null);
  const [error, setError] = useState('');
  return <form className="space-y-5" onChange={() => { setPreview(null); setError(''); }} onSubmit={e => {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    try {
      const input = { teacher: String(form.get('teacher')), date: String(form.get('date')), start: String(form.get('start')), end: String(form.get('end')), duration: Number(form.get('duration')), breakEvery: Number(form.get('breakEvery')), breakMinutes: Number(form.get('breakMinutes')) };
      setPreview({ input, plan: generateReviewSlots(input) }); setError('');
    } catch (e) { setPreview(null); setError(e instanceof ZodError ? e.issues[0].message : e instanceof Error ? e.message : 'Revisá los horarios.'); }
  }}>
    <fieldset disabled={mutation.pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Docente"><select name="teacher" className={reviewInput} required defaultValue={block?.teacher ?? teachers[0]?.id}>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Fecha"><input type="date" name="date" className={reviewInput} required defaultValue={block?.date} /></Field>
        <Field label="Hora de inicio"><input type="time" name="start" className={reviewInput} required defaultValue={block?.start ?? '18:00'} /></Field>
        <Field label="Hora de fin"><input type="time" name="end" className={reviewInput} required defaultValue={block?.end ?? '20:00'} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Minutos por turno"><input type="number" name="duration" className={reviewInput} required min={5} max={240} defaultValue={block?.duration ?? 15} /></Field>
        <Field label="Descanso cada N turnos"><input type="number" name="breakEvery" className={reviewInput} required min={0} max={96} defaultValue={block?.breakEvery ?? 0} /></Field>
        <Field label="Minutos de descanso"><input type="number" name="breakMinutes" className={reviewInput} required min={0} max={120} defaultValue={block?.breakMinutes ?? 0} /></Field>
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">Horarios de Argentina (UTC−3). Para omitir descansos, dejá ambos campos en cero. Cada turno admite un alumno.</p>
      <div className="flex flex-wrap gap-3"><button type="submit" className={reviewSecondary}>Previsualizar turnos</button><button type="button" className={reviewSecondary} onClick={onDone}>Cerrar</button></div>
      {preview && <div className="space-y-4 rounded-xl border border-[var(--color-primary)] bg-[var(--color-surface-container)] p-4">
        <div><p className="text-lg font-bold">{preview.plan.slots.length} turnos disponibles para reservar</p><p className="text-sm text-[var(--color-text-muted)]">{preview.plan.breaks.length} descansos · {teachers.find(t => t.id === preview.input.teacher)?.name}. Los alumnos elegirán su turno.</p></div>
        <ol className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{[...preview.plan.slots.map(s => ({ ...s, kind: 'Turno' })), ...preview.plan.breaks.map(s => ({ ...s, kind: 'Descanso' }))].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(s => <li key={s.startsAt} className={`rounded-lg px-3 py-2 text-sm ${s.kind === 'Descanso' ? 'border border-dashed border-[var(--color-outline)] text-[var(--color-text-muted)]' : 'bg-[var(--color-surface-container-high)]'}`}><span className="font-semibold">{reviewDate(s.startsAt, true)}–{reviewDate(s.endsAt, true)}</span> · {s.kind}</li>)}</ol>
        <button type="button" className={reviewButton} onClick={() => mutation.run(() => saveReviewBlockAction(courseId, review.id, review.revision, block?.id || null, preview.input), onDone)}>{mutation.pending ? 'Guardando…' : block ? 'Confirmar cambios de franja' : 'Crear turnos libres'}</button>
      </div>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}{mutation.feedback}
  </form>;
}

export function ReviewEvaluationForm({ courseId, reviewId, bookingId }: { courseId: string; reviewId: string; bookingId: string }) {
  const mutation = useReviewMutation(); const [attendance, setAttendance] = useState('present');
  return <form className="mt-4 space-y-4" onSubmit={e => {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    mutation.run(() => evaluateReviewAction(courseId, reviewId, bookingId, { attendance, status: attendance === 'absent' ? 'not_passed' : form.get('status'), feedback: form.get('feedback') }));
  }}>
    <fieldset disabled={mutation.pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Asistencia"><select className={reviewInput} value={attendance} onChange={e => setAttendance(e.target.value)}><option value="present">Asistió</option><option value="absent">Ausente</option></select></Field>
        <Field label="Resultado"><select key={attendance} className={reviewInput} name="status" defaultValue="not_passed" disabled={attendance === 'absent'}><option value="not_passed">Todavía no aprobó</option><option value="passed">Aprobó</option></select></Field></div>
      <Field label="Devolución para el alumno"><textarea className={reviewInput} name="feedback" rows={3} maxLength={8000} placeholder="Qué logró y qué necesita trabajar para el próximo intento…" /></Field>
      <p className="text-xs text-[var(--color-text-muted)]">El resultado queda registrado en el historial. Si no aprobó o estuvo ausente, podrá reservar otro turno.</p>
      <button type="submit" className={reviewButton}>{mutation.pending ? 'Guardando…' : 'Guardar evaluación definitiva'}</button>
    </fieldset>{mutation.feedback}
  </form>;
}
