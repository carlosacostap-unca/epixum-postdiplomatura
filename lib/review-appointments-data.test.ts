import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getReviewAgenda } from './review-appointments-data';

const mocks = vi.hoisted(() => ({ collection: vi.fn(), service: vi.fn(), course: vi.fn(), review: vi.fn(), people: vi.fn(), serviceCollection: vi.fn() }));
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
        : name === 'review_block_meetings' ? [{ block: 'block', url: 'https://meet.google.com/abc-defg-hij' }, { block: 'other-block', url: 'https://meet.google.com/xyz-abcd-efg' }]
        : name === 'review_bookings' ? [{ id: 'booking', slot: 'own-slot', status: 'passed', student: 'student', feedback: 'Buen trabajo' }]
        : name === 'review_blocks' ? [{ id: 'block', active: true, teacher: 'privateTeacherId', startsAt: '2099-01-01T12:00:00Z', endsAt: '2099-01-01T13:00:00Z' }]
        : [{ id: 'own-slot', block: 'block', active: true, teacher: 'privateTeacherId', startsAt: '2020-01-01T12:00:00Z' }, { id: 'unassigned-slot', block: 'block', active: true, teacher: 'privateTeacherId', startsAt: '2099-01-01T12:15:00Z' }],
    }));
    mocks.people.mockResolvedValue([
      { id: 'student', name: 'Alumna reservada', email: 'contacto@example.invalid', phone: '3834000000', dni: 'dato-que-no-debe-salir' },
      { id: 'privateTeacherId', name: 'Docente', email: 'docente@example.invalid', phone: '3834111111' },
    ]);
    mocks.serviceCollection.mockImplementation((name: string) => ({ getFullList: name === 'users' ? mocks.people : async () => [] }));
    mocks.service.mockResolvedValue({ collection: mocks.serviceCollection, filter: (value: string) => value });
  });
  it('entrega las notas solo a la vista docente', async () => {
    const data = await getReviewAgenda('course', 'review', 'teacher');
    expect(data.teacherNotes).toEqual({ booking: 'Nota interna confidencial' });
    expect(data.blocks[0].meetUrl).toBe('https://meet.google.com/abc-defg-hij');
  });
  it('no consulta ni serializa notas para los alumnos', async () => {
    const data = await getReviewAgenda('course', 'review', 'student');
    expect(mocks.collection).not.toHaveBeenCalledWith('review_booking_notes');
    expect(data).not.toHaveProperty('teacherNotes');
    expect(data).not.toHaveProperty('studentContacts');
    expect(mocks.serviceCollection).not.toHaveBeenCalledWith('users');
    expect(JSON.stringify(data)).not.toContain('contacto@example.invalid');
    expect(JSON.stringify(data)).not.toContain('3834000000');
    expect(JSON.stringify(data)).not.toContain('Nota interna confidencial');
    expect(data.bookings[0].feedback).toBe('Buen trabajo');
    expect(data.blocks[0].availableSlots).toBe(1);
    expect(data.slots.map(slot => slot.id)).toEqual(['own-slot']);
    expect(data.teachers).toEqual([]);
    expect(data.names).toEqual({});
    expect(JSON.stringify(data)).not.toContain('privateTeacherId');
    expect(JSON.stringify(data)).not.toContain('unassigned-slot');
    expect(data.meetingLinks).toEqual({});
    expect(JSON.stringify(data)).not.toContain('meet.google.com');
  });
  it('rechaza borradores antes de consultar notas o usar el cliente de servicio', async () => {
    mocks.review.mockResolvedValue({ id: 'review', course: 'course', publicationStatus: 'draft' });
    await expect(getReviewAgenda('course', 'review', 'student')).rejects.toThrow('publicada');
    expect(mocks.collection).not.toHaveBeenCalledWith('review_booking_notes');
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it('entrega solamente el enlace de la franja del turno reservado', async () => {
    const base = mocks.collection.getMockImplementation()!;
    mocks.collection.mockImplementation((name: string) => name === 'review_bookings' ? {
      getFullList: async () => [{ id: 'booking', slot: 'own-slot', status: 'reserved', student: 'student' }],
    } : base(name));
    const data = await getReviewAgenda('course', 'review', 'student');
    expect(data.meetingLinks).toEqual({ booking: 'https://meet.google.com/abc-defg-hij' });
    expect(data.blocks[0].meetUrl).toBe('');
    expect(JSON.stringify(data)).not.toContain('https://meet.google.com/xyz-abcd-efg');
  });
  it('entrega contactos solo de alumnos con reserva vigente a docentes, sin incluir otros datos del perfil', async () => {
    const base = mocks.collection.getMockImplementation()!;
    mocks.collection.mockImplementation((name: string) => name === 'review_bookings' ? {
      getFullList: async () => [{ id: 'booking', slot: 'own-slot', status: 'reserved', student: 'student' }],
    } : base(name));
    const agenda = await getReviewAgenda('course', 'review', 'teacher');
    expect(agenda.studentContacts).toEqual({ student: { email: 'contacto@example.invalid', phone: '3834000000' } });
    expect(mocks.people).toHaveBeenCalledWith(expect.objectContaining({ fields: 'id,name,firstName,lastName,email,phone' }));
    expect(JSON.stringify(agenda)).not.toContain('docente@example.invalid');
    expect(JSON.stringify(agenda)).not.toContain('dato-que-no-debe-salir');
  });
  it.each(['passed', 'not_passed', 'cancelled'])('no incluye contactos de reservas sin vigencia: %s', async status => {
    const base = mocks.collection.getMockImplementation()!;
    mocks.collection.mockImplementation((name: string) => name === 'review_bookings' ? {
      getFullList: async () => [{ id: 'booking', slot: 'own-slot', status, student: 'student' }],
    } : base(name));
    expect((await getReviewAgenda('course', 'review', 'teacher')).studentContacts).toEqual({});
  });
  it('rechaza a un usuario sin acceso al curso antes de consultar perfiles', async () => {
    mocks.course.mockRejectedValue(new Error('Sin acceso al curso'));
    await expect(getReviewAgenda('course', 'review', 'teacher')).rejects.toThrow('Sin acceso');
    expect(mocks.service).not.toHaveBeenCalled();
  });
});
