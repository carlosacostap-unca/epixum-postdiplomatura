import { z } from 'zod';

export const REVIEW_TIME_ZONE = 'America/Argentina/Buenos_Aires';
export const REVIEW_MAX_SLOTS = 96;
export const reviewSchema = z.object({
  number: z.number().int().min(1).max(9999),
  title: z.string().trim().min(1, 'Escribí un título.').max(160),
  instructions: z.string().trim().max(4000),
  open: z.boolean(),
});
export const reviewBlockSchema = z.object({
  teacher: z.string().regex(/^[a-zA-Z0-9]{15}$/, 'Elegí un docente del curso.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Elegí una fecha válida.'),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.number().int().min(5).max(240),
  breakEvery: z.number().int().min(0).max(96),
  breakMinutes: z.number().int().min(0).max(120),
}).refine(v => (v.breakEvery === 0) === (v.breakMinutes === 0), { message: 'Para incluir descansos indicá cada cuántos turnos y su duración; para omitirlos dejá ambos en cero.' });
export type ReviewBlockInput = z.infer<typeof reviewBlockSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export interface Review extends ReviewInput { id: string; course: string; revision: string }
export interface ReviewBlock extends ReviewBlockInput { id: string; review: string; active: boolean; startsAt: string; endsAt: string }
export interface ReviewSlot { id: string; review: string; block: string; teacher: string; startsAt: string; endsAt: string; active: boolean }
export type ReviewBookingStatus = 'reserved' | 'cancelled' | 'not_passed' | 'passed';
export interface ReviewBooking {
  id: string; review: string; slot: string; student: string; status: ReviewBookingStatus;
  attendance: '' | 'present' | 'absent'; feedback: string; evaluatedBy: string;
  created: string; updated: string;
}
export const reviewEvaluationSchema = z.object({
  attendance: z.enum(['present', 'absent']),
  status: z.enum(['passed', 'not_passed']),
  feedback: z.string().trim().max(8000),
}).refine(v => v.attendance !== 'absent' || v.status === 'not_passed', { message: 'Un alumno ausente no puede quedar aprobado.' });
export type ReviewEvaluation = z.infer<typeof reviewEvaluationSchema>;
export class ReviewError extends Error {}

export function generateReviewSlots(input: ReviewBlockInput) {
  const data = reviewBlockSchema.parse(input);
  // All course agendas use Argentina local time (UTC-03:00), never the host timezone.
  const startsAt = new Date(`${data.date}T${data.start}:00-03:00`);
  const endsAt = new Date(`${data.date}T${data.end}:00-03:00`);
  const dateCheck = new Date(`${data.date}T12:00:00Z`);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(dateCheck.getTime()) || dateCheck.toISOString().slice(0, 10) !== data.date || endsAt <= startsAt) {
    throw new ReviewError('La fecha debe ser válida y el fin debe ser posterior al inicio, en el mismo día.');
  }
  const slots: { startsAt: string; endsAt: string }[] = [];
  const breaks: { startsAt: string; endsAt: string }[] = [];
  const duration = data.duration * 60000;
  let cursor = startsAt.getTime();
  while (cursor + duration <= endsAt.getTime()) {
    slots.push({ startsAt: new Date(cursor).toISOString(), endsAt: new Date(cursor + duration).toISOString() });
    cursor += duration;
    if (slots.length > REVIEW_MAX_SLOTS) throw new ReviewError(`Una franja puede tener hasta ${REVIEW_MAX_SLOTS} turnos.`);
    if (data.breakEvery && slots.length % data.breakEvery === 0) {
      const breakEnd = cursor + data.breakMinutes * 60000;
      if (breakEnd + duration <= endsAt.getTime()) breaks.push({ startsAt: new Date(cursor).toISOString(), endsAt: new Date(breakEnd).toISOString() });
      cursor = breakEnd;
    }
  }
  if (!slots.length) throw new ReviewError('La franja debe alcanzar para al menos un turno completo.');
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), slots, breaks };
}

export function reviewDate(value: string, timeOnly = false) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: REVIEW_TIME_ZONE, ...(timeOnly ? {} : { day: '2-digit', month: '2-digit', year: 'numeric' } as const),
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
}
export const bookingLabels: Record<ReviewBookingStatus, string> = {
  reserved: 'Reservado · pendiente de evaluación', cancelled: 'Cancelado', not_passed: 'Todavía no aprobó', passed: 'Aprobó',
};
