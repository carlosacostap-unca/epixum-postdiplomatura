import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 'bedel', role: 'estudiante', email: ' BEDEL@Example.com ', verified: true },
  valid: true,
  assigned: true,
  lookup: vi.fn(),
  service: vi.fn(),
  read: vi.fn(),
  course: { id: 'course-a', title: 'Curso A', reviewsEnabled: true, contentsEnabled: true, interactiveClassesEnabled: true, organizationMode: 'semanal' },
}));

vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({
  authStore: { isValid: mocks.valid, model: mocks.user },
  filter: (expression: string, values: unknown) => ({ expression, values }),
  collection: (name: string) => {
    if (name !== 'course_bedels') throw new Error('Unexpected unprivileged read');
    return {
      getFirstListItem: async (filter: { values: { courseId: string } }) => {
        mocks.lookup(filter);
        if (!mocks.assigned || filter.values.courseId !== 'course-a') throw { status: 404 };
        return { id: 'assignment', course: 'course-a' };
      },
      getList: async () => ({ totalItems: mocks.assigned ? 1 : 0 }),
      getFullList: async (options: unknown) => {
        mocks.lookup(options);
        return mocks.assigned ? [{ id: 'assignment', course: 'course-a', expand: { course: mocks.course } }] : [];
      },
    };
  },
}) }));

vi.mock('./pocketbase-service', () => ({ createServiceClient: async () => {
  mocks.service();
  return {
    filter: (expression: string, values: unknown) => ({ expression, values }),
    collection: (name: string) => ({
      getOne: async (id: string, options: unknown) => { mocks.read(name, id, options); return mocks.course; },
      getFullList: async (options: unknown) => { mocks.read(name, options); return []; },
    }),
  };
} }));

import { getBedelCourses, getBedelCourse, getBedelAttendance, getCourseBedels } from './course-bedel-data';

describe('lecturas de bedel', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.assigned = true; mocks.valid = true;
    mocks.user = { id: 'bedel', role: 'estudiante', email: ' BEDEL@Example.com ', verified: true };
    mocks.course.reviewsEnabled = true;
  });

  it('lista solamente asignaciones del correo autenticado normalizado', async () => {
    expect(await getBedelCourses()).toEqual([mocks.course]);
    expect(mocks.lookup).toHaveBeenCalledWith(expect.objectContaining({ filter: expect.objectContaining({ values: { email: 'bedel@example.com' } }) }));
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it.each(['course-b', 'missing'])('no usa el cliente privilegiado para un curso ajeno %s', async id => {
    await expect(getBedelCourse(id)).rejects.toMatchObject({ status: 404 });
    await expect(getBedelAttendance(id)).rejects.toMatchObject({ status: 404 });
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it('revocar la asignación corta contenido y asistencia en la siguiente solicitud', async () => {
    await getBedelCourse('course-a');
    mocks.assigned = false; mocks.service.mockClear();
    expect(await getBedelCourses()).toEqual([]);
    await expect(getBedelCourse('course-a')).rejects.toMatchObject({ status: 404 });
    await expect(getBedelAttendance('course-a')).rejects.toMatchObject({ status: 404 });
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it('no concede acceso a correos sin verificar ni sesiones inválidas', async () => {
    mocks.user.verified = false;
    expect(await getBedelCourses()).toEqual([]);
    await expect(getBedelCourse('course-a')).rejects.toThrow('verificado');
    mocks.user.verified = true; mocks.valid = false;
    await expect(getBedelAttendance('course-a')).rejects.toThrow('verificado');
    expect(mocks.service).not.toHaveBeenCalled();
  });

  it('consulta contenido con filtros de curso y sin claves, entregas ni configuración de IA', async () => {
    await getBedelCourse('course-a');
    const reads = mocks.read.mock.calls;
    expect(reads.map(call => call[0])).toEqual(['courses', 'classes', 'assignments', 'course_contents', 'course_weeks', 'interactive_lessons', 'links']);
    for (const [, options] of reads.slice(1)) expect(options.filter.values).toEqual({ courseId: 'course-a' });
    expect(reads[0][2].fields).not.toMatch(/password|enrollmentKey/i);
    expect(reads.find(call => call[0] === 'assignments')?.[1].fields).not.toContain('systemPrompt');
  });

  it('limita la planilla a asistencias de este curso y excluye evaluaciones privadas', async () => {
    await getBedelAttendance('course-a');
    const options = mocks.read.mock.calls.find(call => call[0] === 'review_bookings')?.[1];
    expect(options.filter.values).toEqual({ courseId: 'course-a' });
    expect(options.filter.expression).toContain('attendance != ""');
    expect(options.fields).not.toMatch(/feedback|evaluatedBy|email|grade/);
    mocks.read.mockClear(); mocks.course.reviewsEnabled = false;
    expect((await getBedelAttendance('course-a')).attendance).toEqual([]);
    expect(mocks.read.mock.calls.some(call => call[0] === 'review_bookings')).toBe(false);
  });

  it('el bedel no puede consultar la lista administrativa de otros bedeles', async () => {
    await expect(getCourseBedels('course-a')).rejects.toThrow('No autorizado');
    expect(mocks.lookup).not.toHaveBeenCalled();
  });
});
