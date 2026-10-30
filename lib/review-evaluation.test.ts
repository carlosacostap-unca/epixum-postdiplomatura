// @vitest-environment node
import type PocketBase from 'pocketbase';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluateReviewBooking } from './review-appointments-service';

vi.mock('./pocketbase-service', () => ({ createServiceClient: vi.fn() }));

function fixture() {
  const booking = { id: 'booking', review: 'review', slot: 'slot', status: 'reserved' };
  const slot = { startsAt: '2026-10-30T18:00:00Z', endsAt: '2026-10-30T18:15:00Z' };
  const writes: { collection: string; id?: string; data: Record<string, unknown> }[] = [];
  const send = vi.fn().mockResolvedValue([]);
  const pb = {
    authStore: { isValid: true, record: { id: 'teacher' } },
    collection: (name: string) => ({ getOne: async () => {
      if (name === 'courses') return { teachers: ['teacher'], reviewsEnabled: true };
      if (name === 'course_reviews') return { id: 'review', course: 'course', revision: 'version' };
      if (name === 'review_bookings') return booking;
      if (name === 'review_slots') return slot;
      throw new Error(`Unexpected collection ${name}`);
    } }),
    createBatch: () => ({ send, collection: (collection: string) => ({
      update: (id: string, data: Record<string, unknown>) => writes.push({ collection, id, data }),
      create: (data: Record<string, unknown>) => writes.push({ collection, data }),
    }) }),
  };
  return { pb: pb as unknown as PocketBase, booking, slot, writes, send };
}
const input = { attendance: 'present', status: 'passed', feedback: 'Objetivo alcanzado.', teacherNotes: 'Observación interna.' };

describe('evaluación desde el inicio del turno', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each(['2026-10-30T18:00:00Z', '2026-10-30T18:07:00Z', '2026-10-30T18:15:00Z', '2026-10-30T19:00:00Z'])('guarda resultado y notas en un único lote a las %s', async now => {
    vi.setSystemTime(new Date(now));
    const f = fixture();
    await evaluateReviewBooking(f.pb, 'course', 'review', 'booking', input);
    expect(f.send).toHaveBeenCalledOnce();
    expect(f.writes).toHaveLength(3);
    expect(f.writes[0]).toMatchObject({ collection: 'course_reviews', data: { expectedRevision: 'version' } });
    expect(f.writes[1]).toEqual({ collection: 'review_bookings', id: 'booking', data: { attendance: 'present', status: 'passed', feedback: input.feedback, evaluatedBy: 'teacher' } });
    expect(f.writes[2]).toEqual({ collection: 'review_booking_notes', data: { booking: 'booking', notes: input.teacherNotes, author: 'teacher' } });
  });

  it('rechaza un milisegundo antes del inicio sin escribir', async () => {
    vi.setSystemTime(new Date('2026-10-30T17:59:59.999Z'));
    const f = fixture();
    await expect(evaluateReviewBooking(f.pb, 'course', 'review', 'booking', input)).rejects.toThrow('inicio');
    expect(f.writes).toEqual([]);
    expect(f.send).not.toHaveBeenCalled();
  });

  it.each(['cancelled', 'passed', 'not_passed'])('no sobrescribe una reserva %s aunque esté dentro del turno', async status => {
    vi.setSystemTime(new Date('2026-10-30T18:07:00Z'));
    const f = fixture(); f.booking.status = status;
    await expect(evaluateReviewBooking(f.pb, 'course', 'review', 'booking', input)).rejects.toThrow('pendiente');
    expect(f.writes).toEqual([]);
  });

  it('rechaza usuarios ajenos al equipo docente durante el turno', async () => {
    vi.setSystemTime(new Date('2026-10-30T18:07:00Z'));
    const f = fixture(); f.pb.authStore.record!.id = 'student';
    await expect(evaluateReviewBooking(f.pb, 'course', 'review', 'booking', input)).rejects.toThrow('docentes asignados');
    expect(f.writes).toEqual([]);
  });
});
