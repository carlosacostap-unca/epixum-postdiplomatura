'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ZodError } from 'zod';
import { generateReviewSlots, reviewDate, reviewPublicationDate, type Review, type ReviewBlock, type ReviewBlockInput } from '@/lib/review-appointments';
import { isPublicationVisible } from '@/lib/publication';
import { saveReviewAction, saveReviewBlockAction, saveReviewMeetingAction, rescheduleReviewBlockAction, evaluateReviewAction } from '@/lib/actions-review-appointments';

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
  const [publicationStatus, setPublicationStatus] = useState(review ? review.publicationStatus || 'published' : 'draft');
  const [publishAt, setPublishAt] = useState(reviewPublicationDate(review?.publishAt));
  const alreadyPublished = review && isPublicationVisible(review);
  return <form className="space-y-4" onSubmit={e => {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    mutation.run(() => saveReviewAction(courseId, review?.id || null, review?.revision || '', {
      number: review?.number ?? Number(form.get('number')), title: form.get('title'), instructions: form.get('instructions'), open: form.get('open') === 'on',
      publicationStatus, publishAt: publicationStatus === 'scheduled' && publishAt ? new Date(`${publishAt}:00-03:00`).toISOString() : '',
      bookingMessage: form.get('bookingMessage'),
    }), id => { if (!review && id) router.push(`/docentes/cursos/${courseId}/revisiones/${id}`); });
  }}>
    <fieldset disabled={mutation.pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[100px_1fr]">
        <Field label="Número"><input className={reviewInput} name="number" type="number" min={1} max={9999} required readOnly={Boolean(review)} defaultValue={review?.number ?? nextNumber} /></Field>
        <Field label="Título"><input className={reviewInput} name="title" maxLength={160} required defaultValue={review?.title} placeholder="Por ejemplo: Revisión de avances" /></Field>
      </div>
      <Field label="Instrucciones para los alumnos"><textarea className={reviewInput} name="instructions" rows={3} maxLength={4000} defaultValue={review?.instructions} placeholder="Qué preparar, dónde encontrarse o enlace de la reunión…" /></Field>
      <Field label="Mensaje antes de solicitar turno"><textarea className={reviewInput} name="bookingMessage" rows={3} maxLength={4000} defaultValue={review?.bookingMessage} placeholder="Por ejemplo: Antes de reservar, asegurate de tener tu proyecto disponible para mostrar…" /></Field>
      <p className="text-xs text-[var(--color-text-muted)]">Opcional. El alumno verá este mensaje al elegir una franja y deberá confirmar la solicitud después de leerlo. Dejalo vacío para reservar directamente.</p>
      <Field label="Estado de publicación"><select className={reviewInput} name="publicationStatus" value={publicationStatus} onChange={e => setPublicationStatus(e.target.value)}>
        <option value="draft">Borrador</option><option value="published">Publicado</option><option value="scheduled">Programado</option>
      </select></Field>
      {publicationStatus === 'scheduled' && <Field label="Fecha y hora de publicación"><input className={reviewInput} type="datetime-local" required value={publishAt} onChange={e => setPublishAt(e.target.value)} /></Field>}
      <p className="text-sm text-[var(--color-text-muted)]">{publicationStatus === 'draft' ? 'Solo los docentes del curso pueden ver esta revisión y preparar sus turnos.' : publicationStatus === 'scheduled' ? 'Se hará visible automáticamente en la fecha y hora indicadas. Horario de Argentina (UTC−3).' : 'Los alumnos matriculados pueden ver esta revisión y sus turnos.'}</p>
      {alreadyPublished && publicationStatus !== 'published' && !(publicationStatus === 'scheduled' && publishAt === reviewPublicationDate(review.publishAt)) && <p className="text-sm text-[var(--color-text-muted)]">Al guardar, la revisión y su historial se ocultarán a los alumnos hasta que vuelva a estar publicada. Las reservas se conservan.</p>}
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
      const input = { teacher: String(form.get('teacher')), date: String(form.get('date')), start: String(form.get('start')), end: String(form.get('end')), duration: Number(form.get('duration')), breakEvery: Number(form.get('breakEvery')), breakMinutes: Number(form.get('breakMinutes')), meetUrl: String(form.get('meetUrl') || '') };
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
      <Field label="Enlace de la sala de reunión"><input type="url" name="meetUrl" className={reviewInput} maxLength={2048} defaultValue={block?.meetUrl} placeholder="https://plataforma.example/sala" /></Field>
      <p className="text-sm text-[var(--color-text-muted)]">Pegá el enlace de la sala de esta franja. El alumno podrá abrirlo desde su reserva una vez que tenga turno asignado.</p>
      <p className="text-sm text-[var(--color-text-muted)]">Horarios de Argentina (UTC−3). Para omitir descansos, dejá ambos campos en cero. Cada turno admite un alumno.</p>
      <div className="flex flex-wrap gap-3"><button type="submit" className={reviewSecondary}>Previsualizar turnos</button><button type="button" className={reviewSecondary} onClick={onDone}>Cerrar</button></div>
      {preview && <div className="space-y-4 rounded-xl border border-[var(--color-primary)] bg-[var(--color-surface-container)] p-4">
        <div><p className="text-lg font-bold">{preview.plan.slots.length} turnos disponibles para reservar</p><p className="text-sm text-[var(--color-text-muted)]">{preview.plan.breaks.length} descansos · {teachers.find(t => t.id === preview.input.teacher)?.name}. Los alumnos elegirán la franja y recibirán el primer turno libre.</p></div>
        <ol className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">{[...preview.plan.slots.map(s => ({ ...s, kind: 'Turno' })), ...preview.plan.breaks.map(s => ({ ...s, kind: 'Descanso' }))].sort((a, b) => a.startsAt.localeCompare(b.startsAt)).map(s => <li key={s.startsAt} className={`rounded-lg px-3 py-2 text-sm ${s.kind === 'Descanso' ? 'border border-dashed border-[var(--color-outline)] text-[var(--color-text-muted)]' : 'bg-[var(--color-surface-container-high)]'}`}><span className="font-semibold">{reviewDate(s.startsAt, true)}–{reviewDate(s.endsAt, true)}</span> · {s.kind}</li>)}</ol>
        <button type="button" className={reviewButton} onClick={() => mutation.run(() => saveReviewBlockAction(courseId, review.id, review.revision, block?.id || null, preview.input), onDone)}>{mutation.pending ? 'Guardando…' : block ? 'Confirmar cambios de franja' : 'Crear turnos libres'}</button>
      </div>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}{mutation.feedback}
  </form>;
}

export function ReviewMeetingEditor({ courseId, review, block }: { courseId: string; review: Review; block: ReviewBlock }) {
  const mutation = useReviewMutation();
  return <form className="mt-4 space-y-4" onSubmit={event => {
    event.preventDefault();
    const url = String(new FormData(event.currentTarget).get('meetUrl') || '');
    mutation.run(() => saveReviewMeetingAction(courseId, review.id, review.revision, block.id, url));
  }}><fieldset disabled={mutation.pending} className="space-y-3">
    <Field label="Enlace de la sala de reunión"><input className={reviewInput} name="meetUrl" type="url" maxLength={2048} defaultValue={block.meetUrl} placeholder="https://plataforma.example/sala" /></Field>
    <p className="text-xs text-[var(--color-text-muted)]">Podés actualizarlo aunque haya reservas. Los alumnos con turno reservado verán el enlace actualizado. Dejalo vacío para quitarlo.</p>
    <button className={reviewButton} type="submit">{mutation.pending ? 'Guardando…' : 'Guardar enlace de la sala'}</button>
  </fieldset>{mutation.feedback}</form>;
}

export function ReviewBlockRescheduler({ courseId, review, block, onDone }: { courseId: string; review: Review; block: ReviewBlock; onDone: () => void }) {
  const mutation = useReviewMutation();
  const [preview, setPreview] = useState<{ date: string; startsAt: string; endsAt: string } | null>(null);
  const [error, setError] = useState('');
  return <form className="space-y-5 pb-4" onChange={() => { setPreview(null); setError(''); }} onSubmit={event => {
    event.preventDefault();
    const date = String(new FormData(event.currentTarget).get('date'));
    try {
      if (date === block.date) throw new Error('Elegí una fecha diferente de la actual.');
      const plan = generateReviewSlots({ ...block, date });
      setPreview({ date, startsAt: plan.startsAt, endsAt: plan.endsAt }); setError('');
    } catch (error) { setError(error instanceof Error ? error.message : 'Revisá la fecha.'); }
  }}>
    <p className="text-sm">Esta franja tiene reservas pendientes. Podés cambiar la fecha conservando los alumnos, sus horarios asignados, la duración de los turnos y los descansos.</p>
    <p className="text-sm">Fecha actual: {reviewDate(block.startsAt)}–{reviewDate(block.endsAt, true)}. Horario de Argentina (UTC−3).</p>
    <fieldset disabled={mutation.pending} className="space-y-4">
      <Field label="Nueva fecha"><input className={reviewInput} name="date" type="date" required defaultValue={block.date} /></Field>
      <div className="flex flex-wrap gap-3"><button className={reviewSecondary} type="submit">Previsualizar cambio de fecha</button><button className={reviewSecondary} type="button" onClick={onDone}>Cerrar</button></div>
      {preview && <div className="space-y-4 rounded-xl border border-[var(--color-primary)] p-4">
        <p className="text-sm">Nueva franja: {reviewDate(preview.startsAt)}–{reviewDate(preview.endsAt, true)}. Las reservas se conservan y los alumnos verán la nueva fecha en su agenda.</p>
        <button className={reviewButton} type="button" onClick={() => mutation.run(() => rescheduleReviewBlockAction(courseId, review.id, review.revision, block.id, preview.date), onDone)}>{mutation.pending ? 'Guardando…' : 'Confirmar cambio de fecha'}</button>
      </div>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-[var(--color-error)]">{error}</p>}{mutation.feedback}
  </form>;
}

export function ReviewEvaluationForm({ courseId, reviewId, bookingId }: { courseId: string; reviewId: string; bookingId: string }) {
  const mutation = useReviewMutation(); const [attendance, setAttendance] = useState('present');
  return <form className="mt-4 space-y-4" onSubmit={e => {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    mutation.run(() => evaluateReviewAction(courseId, reviewId, bookingId, { attendance, status: attendance === 'absent' ? 'not_passed' : form.get('status'), feedback: form.get('feedback'), teacherNotes: form.get('teacherNotes') }));
  }}>
    <fieldset disabled={mutation.pending} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Asistencia"><select className={reviewInput} value={attendance} onChange={e => setAttendance(e.target.value)}><option value="present">Asistió</option><option value="absent">Ausente</option></select></Field>
        <Field label="Resultado"><select key={attendance} className={reviewInput} name="status" defaultValue="not_passed" disabled={attendance === 'absent'}><option value="not_passed">No aprobado</option><option value="passed">Aprobado</option></select></Field></div>
      <Field label="Devolución para el alumno"><textarea className={reviewInput} name="feedback" rows={3} maxLength={8000} placeholder="Qué logró y qué necesita trabajar para el próximo intento…" /></Field>
      <Field label="Notas privadas para docentes"><textarea className={reviewInput} name="teacherNotes" rows={3} maxLength={8000} placeholder="Observaciones internas para el equipo docente…" /></Field>
      <p className="text-xs text-[var(--color-text-muted)]">El alumno verá el resultado y la devolución. Las notas privadas solo pueden verlas los docentes asignados al curso.</p>
      <p className="text-xs text-[var(--color-text-muted)]">El resultado queda registrado en el historial. Si no aprobó o estuvo ausente, podrá reservar otro turno.</p>
      <button type="submit" className={reviewButton}>{mutation.pending ? 'Guardando…' : 'Guardar evaluación definitiva'}</button>
    </fieldset>{mutation.feedback}
  </form>;
}
