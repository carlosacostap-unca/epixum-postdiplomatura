// @vitest-environment node
import type PocketBase from 'pocketbase';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rescheduleReviewBlock } from './review-appointments-service';
import { generateReviewSlots } from './review-appointments';

vi.mock('./pocketbase-service', () => ({ createServiceClient: vi.fn() }));

const teacher = 'teacher00000001';
const review = { id: 'review', course: 'course', revision: 'version' };
const block = { id: 'block', review: 'review', teacher, active: true, date: '2026-10-29', start: '15:00', end: '17:00', duration: 15, breakEvery: 0, breakMinutes: 0, startsAt: '2026-10-29T18:00:00Z', endsAt: '2026-10-29T20:00:00Z' };

function fixture() {
  const slots = generateReviewSlots(block).slots.map((slot, index) => ({ ...slot, id: `slot${index}`, review: review.id, block: block.id, teacher, active: true }));
  const writes: { collection: string; id: string; data: Record<string, unknown> }[] = [];
  const send = vi.fn().mockResolvedValue([]);
  const getBlock = vi.fn().mockResolvedValue(block);
  const getSlots = vi.fn().mockResolvedValue(slots);
  const overlaps = vi.fn().mockResolvedValue({ totalItems: 0 });
  const evaluated = vi.fn().mockResolvedValue({ totalItems: 0 });
  const pb = {
    authStore: { isValid: true, record: { id: teacher } },
    filter: (template: string) => template,
    collection: (name: string) => ({
      getOne: name === 'courses' ? async () => ({ id: 'course', teachers: [teacher], reviewsEnabled: true }) : name === 'course_reviews' ? async () => review : getBlock,
      getList: name === 'review_blocks' ? overlaps : evaluated,
      getFullList: getSlots,
    }),
    createBatch: () => ({ send, collection: (collection: string) => ({ update: (id: string, data: Record<string, unknown>) => writes.push({ collection, id, data }) }) }),
  };
  return { pb: pb as unknown as PocketBase, slots, writes, send, getBlock, getSlots, overlaps, evaluated };
}

describe('reprogramación de fecha de franjas con reservas', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-28T12:00:00Z'));
    vi.stubEnv('POCKETBASE_ADMIN_PASSWORD', 'test-only-secret'); vi.stubEnv('NEXT_PUBLIC_POCKETBASE_URL', 'https://example.invalid');
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
  it('mueve todos los turnos en un lote con control de revisión, conservando sus IDs y sin escribir reservas', async () => {
    const f = fixture();
    await rescheduleReviewBlock(f.pb, 'course', 'review', 'version', 'block', '2026-10-30');
    expect(f.send).toHaveBeenCalledOnce();
    expect(f.writes).toHaveLength(10);
    expect(f.writes[0]).toMatchObject({ collection: 'course_reviews', data: { expectedRevision: 'version' } });
    expect(f.writes[1]).toMatchObject({ collection: 'review_blocks', id: 'block', data: { date: '2026-10-30', startsAt: '2026-10-30T18:00:00.000Z', endsAt: '2026-10-30T20:00:00.000Z' } });
    const movedSlots = f.writes.filter(write => write.collection === 'review_slots');
    expect(movedSlots[0].data.startsAt).toBe('2026-10-30 18:00:00.000Z');
    expect(movedSlots.map(write => write.id)).toEqual(f.slots.map(slot => slot.id));
    movedSlots.forEach((write, index) => expect(Date.parse(String(write.data.startsAt)) - Date.parse(f.slots[index].startsAt)).toBe(86400000));
    expect(f.writes.some(write => write.collection === 'review_bookings')).toBe(false);
  });
  it.each(['2026-10-27', '2026-10-29', '2026-02-30'])('rechaza fecha inválida, pasada o sin cambios: %s', async date => {
    const f = fixture();
    await expect(rescheduleReviewBlock(f.pb, 'course', 'review', 'version', 'block', date)).rejects.toThrow();
    expect(f.send).not.toHaveBeenCalled();
  });
  it('rechaza a un alumno antes de consultar la franja', async () => {
    const f = fixture(); f.pb.authStore.record!.id = 'student';
    await expect(rescheduleReviewBlock(f.pb, 'course', 'review', 'version', 'block', '2026-10-30')).rejects.toThrow('docentes asignados');
    expect(f.getBlock).not.toHaveBeenCalled();
  });
  it.each([
    { review: 'other' }, { active: false }, { startsAt: '2026-10-27T18:00:00Z' }, { teacher: 'other' },
  ])('rechaza franjas ajenas, retiradas, iniciadas o sin docente asignado: %j', async patch => {
    const f = fixture(); f.getBlock.mockResolvedValue({ ...block, ...patch });
    await expect(rescheduleReviewBlock(f.pb, 'course', 'review', 'version', 'block', '2026-10-30')).rejects.toThrow();
    expect(f.send).not.toHaveBeenCalled();
  });
  it('rechaza revisiones desactualizadas', async () => {
    const f = fixture();
    await expect(rescheduleReviewBlock(f.pb, 'course', 'review', 'stale', 'block', '2026-10-30')).rejects.toThrow();
    expect(f.send).not.toHaveBeenCalled();
  });
  it('rechaza superposiciones y turnos alterados antes de escribir', async () => {
    const f = fixture(); f.overlaps.mockResolvedValue({ totalItems: 1 });
    await expect(rescheduleReviewBlock(f.pb, 'course', 'review', 'version', 'block', '2026-10-30')).rejects.toThrow('superpuesta');
    f.overlaps.mockResolvedValue({ totalItems: 0 }); f.getSlots.mockResolvedValue(f.slots.slice(1));
    await expect(rescheduleReviewBlock(f.pb, 'course', 'review', 'version', 'block', '2026-10-30')).rejects.toThrow('turnos de esta franja cambiaron');
    expect(f.send).not.toHaveBeenCalled();
  });
  it('protege las evaluaciones registradas y comunica el rechazo de un lote', async () => {
    const f = fixture(); f.evaluated.mockResolvedValue({ totalItems: 1 });
    await expect(rescheduleReviewBlock(f.pb, 'course', 'review', 'version', 'block', '2026-10-30')).rejects.toThrow('evaluaciones');
    expect(f.send).not.toHaveBeenCalled();
    f.evaluated.mockResolvedValue({ totalItems: 0 }); f.send.mockRejectedValue(new Error('conflict'));
    await expect(rescheduleReviewBlock(f.pb, 'course', 'review', 'version', 'block', '2026-10-30')).rejects.toThrow('Actualizá');
  });
});
