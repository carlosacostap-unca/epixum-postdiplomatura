'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, Dialog } from '@/components/ui';
import { PublicationBadge } from '@/components/course/PublicationBadge';
import { bookingLabels, reviewDate, type ReviewBlock } from '@/lib/review-appointments';
import type { getReviewAgenda } from '@/lib/review-appointments-data';
import { cancelReviewAction, removeReviewBlockAction, reserveReviewAction } from '@/lib/actions-review-appointments';
import { ReviewBlockEditor, ReviewBlockRescheduler, ReviewEditor, ReviewMeetingEditor, ReviewEvaluationForm, reviewButton, reviewSecondary, reviewInput, reviewPanel, useReviewMutation } from './ReviewForms';

type Data = Awaited<ReturnType<typeof getReviewAgenda>>;
export function ReviewAgenda({ data, mode }: { data: Data; mode: 'teacher' | 'student' }) {
  const { course, review, blocks, slots, bookings, names, teachers } = data;
  const teacherMode = mode === 'teacher'; const router = useRouter(); const mutation = useReviewMutation();
  const reservation = useReviewMutation();
  const [confirmation, setConfirmation] = useState<Data['blocks'][number] | null>(null);
  const [editing, setEditing] = useState<ReviewBlock | 'new' | null>(null);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [now, setNow] = useState(data.now);
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(interval); }, []);
  const passed = !teacherMode && bookings.some(b => b.status === 'passed');
  const pending = !teacherMode && bookings.some(b => b.status === 'reserved');
  const free = slots.filter(s => s.active && !s.occupied && Date.parse(s.startsAt) > now && course.teachers?.includes(s.teacher));
  const waiting = bookings.filter(b => b.status === 'reserved' && slots.some(s => s.id === b.slot && Date.parse(s.endsAt) <= now));
  const canReserve = !passed && !pending && review.open;
  const base = `/${teacherMode ? 'docentes' : 'estudiantes'}/cursos/${course.id}/revisiones`;
  const editingBlock = editing && editing !== 'new' ? blocks.find(block => block.id === editing.id) ?? editing : undefined;
  const editingHasPending = editingBlock && bookings.some(booking => booking.status === 'reserved' && slots.some(slot => slot.block === editingBlock.id && slot.id === booking.slot));
  return <div className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href={base} className="text-sm font-semibold text-[var(--color-primary)]">← Todas las revisiones</Link><button className={reviewSecondary} onClick={() => router.refresh()}>Actualizar disponibilidad</button></div>
    {teacherMode && <div className="flex flex-wrap items-center gap-3"><span className="text-sm font-semibold">Publicación de la revisión</span><PublicationBadge status={review.publicationStatus || undefined} publishAt={review.publishAt || undefined} /></div>}
    <div className="grid gap-4 sm:grid-cols-3">
      {[{ label: teacherMode ? 'Turnos libres futuros' : 'Franjas con disponibilidad', value: teacherMode ? free.length : blocks.filter(block => block.availableSlots > 0 && Date.parse(block.endsAt) > now).length }, { label: teacherMode ? 'Pendientes de evaluación' : 'Mis intentos', value: teacherMode ? waiting.length : bookings.filter(b => b.status !== 'cancelled').length }, { label: 'Estado de la revisión', value: passed ? 'Aprobada' : review.open ? 'Reservas abiertas' : 'Reservas cerradas' }].map(item => <div key={item.label} className={reviewPanel}><p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{item.label}</p><p className="mt-2 text-2xl font-bold">{item.value}</p></div>)}
    </div>
    {review.instructions && <div className={`${reviewPanel} whitespace-pre-wrap text-sm leading-relaxed`}><h2 className="mb-2 font-bold">Para esta revisión</h2>{review.instructions}</div>}
    {teacherMode && <details className={reviewPanel} open><summary className="cursor-pointer font-bold">Editar revisión y publicación</summary><div className="mt-5"><ReviewEditor key={review.revision} courseId={course.id} review={review} /></div></details>}
    {!teacherMode && <p role="status" className="rounded-xl bg-[var(--color-surface-container)] p-4 text-sm">{passed ? 'Ya aprobaste esta revisión. Podés consultar tus devoluciones en el historial.' : pending ? 'Tenés un turno reservado o pendiente de evaluación. Podés cancelarlo antes del inicio; después, esperá la devolución docente para saber si necesitás otro intento.' : !review.open ? 'Las nuevas reservas están cerradas. Tus turnos e historial se conservan.' : 'Elegí una franja. Al solicitarla, se te asignará el primer turno disponible y verás tu horario en Mis reservas y devoluciones. Podés tener una reserva pendiente por revisión.'}</p>}
    {mutation.feedback}
    {!confirmation && reservation.feedback}
    <section className="space-y-4" aria-labelledby="review-schedule-title">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="review-schedule-title" className="text-2xl font-bold">{teacherMode ? 'Franjas y turnos' : 'Elegí una franja'}</h2><p className="mt-1 text-sm text-[var(--color-text-muted)]">Horarios de Argentina (UTC−3).</p></div>{teacherMode && <button className={reviewButton} onClick={() => setEditing('new')}>Agregar franja</button>}</div>
      {teacherMode && <Dialog open={Boolean(editing)} onOpenChange={open => { if (!open) setEditing(null); }} title={editing === 'new' ? 'Nueva franja docente' : 'Editar franja'} className="sm:w-[min(calc(100%_-_2rem),48rem)]">
        {editing && (editingBlock && editingHasPending
          ? <ReviewBlockRescheduler key={`${editingBlock.id}-${review.revision}`} courseId={course.id} review={review} block={editingBlock} onDone={() => setEditing(null)} />
          : <ReviewBlockEditor key={`${editingBlock?.id ?? 'new'}-${review.revision}`} courseId={course.id} review={review} teachers={teachers} block={editingBlock} onDone={() => setEditing(null)} />)}
      </Dialog>}
      {teacherMode && teachers.length > 1 && <label className="block max-w-sm text-sm font-semibold">Filtrar por docente<select className={reviewInput} value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)}><option value="">Todos los docentes</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
      {!blocks.some(b => (!teacherFilter || b.teacher === teacherFilter) && (teacherMode || Date.parse(b.endsAt) > now)) && <div className={`${reviewPanel} text-sm text-[var(--color-text-muted)]`}>{teacherMode ? 'Todavía no hay franjas. Agregá una para ofrecer turnos a los alumnos.' : 'Todavía no hay horarios próximos para esta selección. Volvé a consultar cuando el docente agregue disponibilidad.'}</div>}
      <div className="space-y-4">{blocks.filter(b => (!teacherFilter || b.teacher === teacherFilter) && (teacherMode || Date.parse(b.endsAt) > now)).map(block => {
        const blockSlots = slots.filter(s => s.block === block.id && s.active);
        const hasPending = bookings.some(b => b.status === 'reserved' && blockSlots.some(s => s.id === b.slot));
        return <article className={reviewPanel} key={block.id}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold">{teacherMode ? names[block.teacher] || 'Docente' : 'Franja de atención'}</h3><p className="mt-1 text-sm">{reviewDate(block.startsAt)}–{reviewDate(block.endsAt, true)}</p><p className="mt-1 text-xs text-[var(--color-text-muted)]">Turnos de {block.duration} min{teacherMode && (block.breakEvery ? ` · Descanso de ${block.breakMinutes} min cada ${block.breakEvery} turnos` : ' · Sin descansos')}</p></div>
            {teacherMode && Date.parse(block.startsAt) > now && <div className="flex gap-2"><button className={reviewSecondary} disabled={mutation.pending} onClick={() => setEditing(block)}>Editar</button><button className={reviewSecondary} disabled={hasPending || mutation.pending} onClick={() => { if (window.confirm('¿Retirar esta franja de la disponibilidad? El historial se conserva.')) mutation.run(() => removeReviewBlockAction(course.id, review.id, review.revision, block.id)); }}>Retirar</button></div>}
          </div>
          {teacherMode && hasPending && <p className="mt-3 text-xs text-[var(--color-text-muted)]">La franja tiene reservas pendientes. Desde Editar podés cambiar la fecha conservando los turnos; no se puede retirar ni cambiar los horarios.</p>}
          {teacherMode && <div className="mt-4 space-y-3">{block.meetUrl && <a className={reviewSecondary} href={block.meetUrl} target="_blank" rel="noopener noreferrer">Abrir sala de reunión</a>}<details><summary className="cursor-pointer text-sm font-semibold text-[var(--color-primary)]">Configurar enlace de la sala</summary><ReviewMeetingEditor key={`${block.id}-${review.revision}`} courseId={course.id} review={review} block={block} /></details></div>}
          {!teacherMode && <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{block.availableSlots > 0 ? 'Hay turnos disponibles. Te asignaremos el primero libre.' : 'Sin turnos disponibles en esta franja.'}</p><button className={reviewButton} disabled={!canReserve || block.availableSlots === 0 || mutation.pending || reservation.pending} onClick={() => { if (review.bookingMessage) setConfirmation(block); else reservation.run(() => reserveReviewAction(course.id, review.id, block.id)); }}>{reservation.pending ? 'Asignando…' : 'Solicitar turno en esta franja'}</button></div>}
          {teacherMode && <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{blockSlots.map(slot => {
            const elapsed = Date.parse(slot.startsAt) <= now;
            const inactiveTeacher = !course.teachers?.includes(slot.teacher);
            const label = slot.occupied ? 'Reservado' : elapsed ? 'Finalizado / en curso' : inactiveTeacher ? 'No disponible' : 'Libre';
            return <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)] p-4">
              <div><p className="font-semibold tabular-nums">{reviewDate(slot.startsAt, true)}–{reviewDate(slot.endsAt, true)}</p><p className={`mt-1 text-xs ${label === 'Libre' ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>{label}</p></div>
            </li>;
          })}</ul>}
        </article>;
      })}</div>
    </section>
    {!teacherMode && <Dialog open={Boolean(confirmation)} onOpenChange={open => { if (!open && !reservation.pending) setConfirmation(null); }} title="Antes de solicitar tu turno" dismissible={!reservation.pending}
      description={confirmation ? `Franja: ${reviewDate(confirmation.startsAt)}–${reviewDate(confirmation.endsAt, true)}. Horario de Argentina (UTC−3).` : undefined}
      footer={<><button className={reviewSecondary} disabled={reservation.pending} onClick={() => setConfirmation(null)}>Volver sin reservar</button><button className={reviewButton} disabled={reservation.pending || !canReserve || !confirmation} onClick={() => { if (confirmation) reservation.run(() => reserveReviewAction(course.id, review.id, confirmation.id, review.bookingMessage || ''), () => setConfirmation(null)); }}>{reservation.pending ? 'Asignando…' : 'Confirmar solicitud'}</button></>}>
      <div className="space-y-4 pb-2"><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{review.bookingMessage}</p><p className="text-sm text-[var(--color-text-muted)]">Al confirmar, te asignaremos el primer turno disponible de esta franja. Todavía no reservaste un lugar.</p>{confirmation && reservation.feedback}</div>
    </Dialog>}
    <section className="space-y-4" aria-labelledby="review-bookings-title"><h2 id="review-bookings-title" className="text-2xl font-bold">{teacherMode ? 'Reservas y evaluaciones' : 'Mis reservas y devoluciones'}</h2>
      {!bookings.length && <p className="text-sm text-[var(--color-text-muted)]">{teacherMode ? 'Las reservas aparecerán cuando los alumnos soliciten una franja.' : 'Todavía no solicitaste un turno para esta revisión.'}</p>}
      <div className="space-y-4">{[...bookings].sort((a, b) => Number(waiting.some(w => w.id === b.id)) - Number(waiting.some(w => w.id === a.id))).map(booking => {
        const slot = slots.find(s => s.id === booking.slot); if (!slot) return null;
        return <article className={reviewPanel} key={booking.id}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div>{teacherMode && <h3 className="mb-2 text-lg font-bold">{names[booking.student] || 'Alumno'}</h3>}<p className="font-semibold">{reviewDate(slot.startsAt)}–{reviewDate(slot.endsAt, true)}</p><p className="mt-1 text-sm text-[var(--color-text-muted)]">{teacherMode && `Con ${names[slot.teacher] || 'Docente'}`}{booking.attendance && `${teacherMode ? ' · ' : ''}${booking.attendance === 'present' ? 'Asistió' : 'Ausente'}`}</p></div><Badge tone={booking.status === 'passed' ? 'success' : booking.status === 'reserved' ? 'warning' : 'neutral'}>{booking.status === 'reserved' && Date.parse(slot.endsAt) <= now ? 'Pendiente de evaluación' : bookingLabels[booking.status]}</Badge></div>
          {booking.feedback && <div className="mt-4 rounded-xl bg-[var(--color-surface-container)] p-4 text-sm"><p className="mb-2 font-bold">Devolución docente</p><p className="whitespace-pre-wrap leading-relaxed">{booking.feedback}</p></div>}
          {booking.status === 'reserved' && (data.meetingLinks?.[booking.id] ? <a className={`${reviewButton} mt-4`} href={data.meetingLinks[booking.id]} target="_blank" rel="noopener noreferrer">Unirme a la sala de reunión</a> : <p className="mt-4 text-sm text-[var(--color-text-muted)]">El docente todavía no cargó el enlace de la sala de reunión para esta franja.</p>)}
          {teacherMode && data.teacherNotes?.[booking.id] && <div className="mt-4 rounded-xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] p-4 text-sm"><p className="mb-2 font-bold">Notas privadas · Solo docentes</p><p className="whitespace-pre-wrap leading-relaxed">{data.teacherNotes[booking.id]}</p></div>}
          {booking.status === 'reserved' && Date.parse(slot.startsAt) > now && <button className={`${reviewSecondary} mt-4`} disabled={mutation.pending} onClick={() => { if (window.confirm('¿Cancelar este turno y dejarlo libre?')) mutation.run(() => cancelReviewAction(course.id, review.id, booking.id, mode)); }}>Cancelar reserva</button>}
          {teacherMode && booking.status === 'reserved' && Date.parse(slot.endsAt) <= now && <details className="mt-4 border-t border-[var(--color-outline-variant)] pt-4"><summary className="cursor-pointer font-semibold text-[var(--color-primary)]">Evaluar turno: resultado, devolución y notas privadas</summary><ReviewEvaluationForm courseId={course.id} reviewId={review.id} bookingId={booking.id} /></details>}
        </article>;
      })}</div>
    </section>
  </div>;
}
