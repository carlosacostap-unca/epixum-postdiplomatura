import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getReviewAgenda } from './review-appointments-data';

const mocks = vi.hoisted(() => ({ collection: vi.fn(), service: vi.fn(), course: vi.fn(), review: vi.fn() }));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({ collection: mocks.collection, filter: (value: string) => value }) }));
vi.mock('./pocketbase-service', () => ({ createServiceClient: mocks.service }));
vi.mock('./review-appointments-service', () => ({ requireReviewCourse: mocks.course, ensureReviewAllocationKey: vi.fn().mockResolvedValue('server-only') }));

describe('privacidad de las notas en la agenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.course.mockResolvedValue({ id: 'course', teachers: ['privateTeacherId'], reviewsEnabled: true });
    mocks.review.mockResolvedValue({ id: 'review', course: 'course', publicationStatus: 'published' });
    mocks.collection.mockImplementation((name: string) => ({
      getOne: mocks.review,
      getFullList: async () => name === 'review_booking_notes' ? [{ booking: 'booking', notes: 'Nota interna confidencial' }]
        : name === 'review_bookings' ? [{ id: 'booking', slot: 'own-slot', status: 'passed', student: 'student', feedback: 'Buen trabajo' }]
        : name === 'review_blocks' ? [{ id: 'block', active: true, teacher: 'privateTeacherId', startsAt: '2099-01-01T12:00:00Z', endsAt: '2099-01-01T13:00:00Z' }]
        : [{ id: 'own-slot', block: 'block', active: true, teacher: 'privateTeacherId', startsAt: '2020-01-01T12:00:00Z' }, { id: 'unassigned-slot', block: 'block', active: true, teacher: 'privateTeacherId', startsAt: '2099-01-01T12:15:00Z' }],
    }));
    mocks.service.mockResolvedValue({ collection: () => ({ getFullList: async () => [] }), filter: (value: string) => value });
  });
  it('entrega las notas solo a la vista docente', async () => {
    const data = await getReviewAgenda('course', 'review', 'teacher');
    expect(data.teacherNotes).toEqual({ booking: 'Nota interna confidencial' });
  });
  it('no consulta ni serializa notas para los alumnos', async () => {
    const data = await getReviewAgenda('course', 'review', 'student');
    expect(mocks.collection).not.toHaveBeenCalledWith('review_booking_notes');
    expect(data).not.toHaveProperty('teacherNotes');
    expect(JSON.stringify(data)).not.toContain('Nota interna confidencial');
    expect(data.bookings[0].feedback).toBe('Buen trabajo');
    expect(data.blocks[0].availableSlots).toBe(1);
    expect(data.slots.map(slot => slot.id)).toEqual(['own-slot']);
    expect(data.teachers).toEqual([]);
    expect(data.names).toEqual({});
    expect(JSON.stringify(data)).not.toContain('privateTeacherId');
    expect(JSON.stringify(data)).not.toContain('unassigned-slot');
  });
  it('rechaza borradores antes de consultar notas o usar el cliente de servicio', async () => {
    mocks.review.mockResolvedValue({ id: 'review', course: 'course', publicationStatus: 'draft' });
    await expect(getReviewAgenda('course', 'review', 'student')).rejects.toThrow('publicada');
    expect(mocks.collection).not.toHaveBeenCalledWith('review_booking_notes');
    expect(mocks.service).not.toHaveBeenCalled();
  });
});
