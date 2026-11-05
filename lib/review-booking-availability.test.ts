// @vitest-environment node
import PocketBase from 'pocketbase';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServiceClient } from './pocketbase-service';
import { reserveReviewBlock } from './review-appointments-service';

vi.mock('./pocketbase-service', () => ({ createServiceClient: vi.fn() }));

describe('reasignación de turnos cancelados el mismo día', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-05T18:16:00Z'));
    vi.stubEnv('POCKETBASE_SUPERUSER_PASSWORD', 'test-only-secret');
    vi.stubEnv('NEXT_PUBLIC_POCKETBASE_URL', 'https://example.invalid');
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  function fixture() {
    const pb = new PocketBase('https://example.invalid');
    const slots = [
      { id: 'expired', startsAt: '2026-11-05 18:00:00.000Z' },
      { id: 'started', startsAt: '2026-11-05 18:16:00.000Z' },
      { id: 'occupied', startsAt: '2026-11-05 18:30:00.000Z' },
      { id: 'cancelled-slot', startsAt: '2026-11-05 18:45:00.000Z' },
      { id: 'later', startsAt: '2026-11-05 19:00:00.000Z' },
    ];
    const history = [
      { slot: 'occupied', status: 'reserved' },
      { slot: 'cancelled-slot', status: 'cancelled' },
      { slot: 'cancelled-slot', status: 'cancelled' },
    ];
    const futureSlots = vi.fn(async ({ filter }: { filter: string }) => {
      // PocketBase stores dates with a space; SQL compares these strings.
      const cutoff = /startsAt > '([^']+)'/.exec(filter)![1];
      return slots.filter(slot => slot.startsAt > cutoff);
    });
    vi.spyOn(pb.authStore, 'isValid', 'get').mockReturnValue(true);
    vi.spyOn(pb.authStore, 'record', 'get').mockReturnValue({ id: 'new-student', collectionId: 'users', collectionName: 'users' });
    vi.spyOn(pb, 'collection').mockImplementation(((name: string) => ({
      getOne: async () => name === 'courses' ? { teachers: ['teacher'], reviewsEnabled: true }
        : name === 'course_reviews' ? { id: 'review', course: 'course', open: true, revision: 'version', publicationStatus: 'published' }
        : { id: 'block', review: 'review', teacher: 'teacher', active: true, endsAt: '2026-11-05 20:00:00.000Z' },
      getList: async () => ({ totalItems: name === 'course_enrollments' ? 1 : 0, items: [] }),
      getFullList: futureSlots,
    })) as unknown as typeof pb.collection);
    const create = vi.fn();
    const send = vi.fn().mockResolvedValue([]);
    vi.spyOn(pb, 'createBatch').mockReturnValue({ send, collection: () => ({ update: vi.fn(), create }) } as unknown as ReturnType<PocketBase['createBatch']>);
    vi.mocked(createServiceClient).mockResolvedValue({ collection: (name: string) => ({
      getOne: async () => ({ orderedBooking: true }),
      getFullList: async () => name === 'review_bookings' ? history.filter(booking => booking.status !== 'cancelled') : [],
    }) } as unknown as PocketBase);
    return { pb, slots, history, create, send };
  }

  it('asigna el primer hueco futuro cancelado a otro alumno, aunque la franja ya empezó', async () => {
    const f = fixture();
    expect(await reserveReviewBlock(f.pb, 'course', 'review', 'block')).toBe('cancelled-slot');
    expect(f.create).toHaveBeenCalledWith(expect.objectContaining({ slot: 'cancelled-slot', student: 'new-student', status: 'reserved' }));
    expect(f.send).toHaveBeenCalledOnce();
  });

  it('omite huecos cancelados que ya comenzaron', async () => {
    vi.setSystemTime(new Date('2026-11-05T18:45:00Z'));
    const f = fixture();
    expect(await reserveReviewBlock(f.pb, 'course', 'review', 'block')).toBe('later');
  });

  it('rechaza la solicitud cuando todos los turnos futuros están ocupados', async () => {
    const f = fixture();
    f.history.push({ slot: 'cancelled-slot', status: 'reserved' }, { slot: 'later', status: 'reserved' });
    await expect(reserveReviewBlock(f.pb, 'course', 'review', 'block')).rejects.toThrow('no tiene turnos disponibles');
    expect(f.send).not.toHaveBeenCalled();
  });
});
