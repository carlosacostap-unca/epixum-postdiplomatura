import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  role: 'admin', valid: true, teachers: [] as string[], enrolled: false,
  users: [] as { id: string; role: string }[], assignments: new Map<string, Record<string, string>>(),
  create: vi.fn(), remove: vi.fn(), revalidate: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => ({
  authStore: { isValid: mocks.valid, model: { role: mocks.role, id: 'actor' } },
  filter: (_expression: string, params: unknown) => params,
  collection: (name: string) => {
    if (name === 'courses') return { getOne: async () => ({ id: 'course', teachers: mocks.teachers }) };
    if (name === 'users') return { getFullList: async () => mocks.users };
    if (name === 'course_enrollments') return { getList: async () => ({ totalItems: mocks.enrolled ? 1 : 0 }) };
    if (name !== 'course_bedels') throw new Error('unexpected collection');
    return {
      create: async (data: Record<string, string>) => {
        if ([...mocks.assignments.values()].some(row => row.email === data.email && row.course === data.course)) throw { status: 400 };
        mocks.create(data); mocks.assignments.set(`row-${mocks.assignments.size}`, data);
      },
      getOne: async (id: string) => mocks.assignments.get(id),
      delete: async (id: string) => { mocks.remove(id); mocks.assignments.delete(id); },
    };
  },
}) }));

import { addCourseBedel, removeCourseBedel } from './actions-course-bedels';
const input = { firstName: ' Ana ', lastName: ' Pérez ', email: ' ANA@EXAMPLE.COM ' };

describe('administración de bedeles', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.role = 'admin'; mocks.valid = true; mocks.users = []; mocks.teachers = []; mocks.enrolled = false; mocks.assignments.clear();
  });
  it('asigna por email antes de que exista una cuenta y permite varios o ninguno', async () => {
    expect(await addCourseBedel('course', input)).toEqual({ success: true });
    expect(mocks.create).toHaveBeenCalledWith({ course: 'course', firstName: 'Ana', lastName: 'Pérez', email: 'ana@example.com' });
    expect(await addCourseBedel('course', { ...input, email: 'otro@example.com' })).toEqual({ success: true });
    expect(mocks.assignments.size).toBe(2);
    await removeCourseBedel('course', 'row-0'); await removeCourseBedel('course', 'row-1');
    expect(mocks.assignments.size).toBe(0);
  });
  it('rechaza emails repetidos y permite el mismo bedel en otro curso', async () => {
    await addCourseBedel('course', input);
    expect(await addCourseBedel('course', input)).toMatchObject({ success: false });
    expect(await addCourseBedel('other', input)).toEqual({ success: true });
  });
  it.each(['estudiante', 'docente', 'bedel'])('rechaza mutaciones del rol %s', async role => {
    mocks.role = role;
    expect(await addCourseBedel('course', input)).toMatchObject({ success: false });
    expect(await removeCourseBedel('course', 'row')).toMatchObject({ success: false });
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('rechaza sesiones inválidas y datos incompletos', async () => {
    mocks.valid = false;
    expect(await addCourseBedel('course', input)).toMatchObject({ success: false });
    mocks.valid = true;
    for (const data of [{ ...input, email: 'inválido' }, { ...input, firstName: '' }, { ...input, lastName: '' }]) {
      expect(await addCourseBedel('course', data)).toMatchObject({ success: false });
    }
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('no retira asignaciones de otro curso', async () => {
    mocks.assignments.set('row', { course: 'other' });
    expect(await removeCourseBedel('course', 'row')).toMatchObject({ success: false });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('rechaza un docente, administrador o alumno del mismo curso', async () => {
    mocks.users = [{ id: 'user', role: 'docente' }]; mocks.teachers = ['user'];
    expect(await addCourseBedel('course', input)).toMatchObject({ success: false });
    mocks.teachers = []; mocks.users[0].role = 'admin';
    expect(await addCourseBedel('course', input)).toMatchObject({ success: false });
    mocks.users[0].role = 'estudiante'; mocks.enrolled = true;
    expect(await addCourseBedel('course', input)).toMatchObject({ success: false });
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
