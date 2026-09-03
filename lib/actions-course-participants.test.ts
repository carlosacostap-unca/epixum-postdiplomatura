import { beforeEach, describe, expect, it, vi } from 'vitest';

const notFound = () => Object.assign(new Error('not found'), { status: 404 });
const mocks = vi.hoisted(() => ({
  role: 'admin',
  teachers: [] as string[],
  users: new Set(['user-1', 'user-2', 'teacher-1', 'student-1']),
  enrollments: new Map<string, { id: string; course: string; student: string }>(),
  serviceDelete: vi.fn(),
  serviceUpdate: vi.fn(),
  batchSend: vi.fn(),
  revalidatePath: vi.fn(),
  batchFails: false,
  skipTeacherWrite: false,
}));

function collection(name: string, service = false) {
  if (name === 'users') return {
    getOne: vi.fn(async (id: string) => {
      if (!mocks.users.has(id)) throw notFound();
      return { id };
    }),
  };
  if (name === 'courses') return {
    getOne: vi.fn(async () => ({ id: 'course-1', teachers: [...mocks.teachers] })),
    update: vi.fn(async (_id: string, data: Record<string, string[]>) => {
      mocks.serviceUpdate(data);
      if (!mocks.skipTeacherWrite && data['teachers+']) mocks.teachers = [...new Set([...mocks.teachers, ...data['teachers+']])];
      if (!mocks.skipTeacherWrite && data['teachers-']) mocks.teachers = mocks.teachers.filter((id) => !data['teachers-'].includes(id));
      return { id: 'course-1', teachers: mocks.teachers };
    }),
  };
  if (name === 'course_enrollments') return {
    getOne: vi.fn(async (id: string) => {
      const value = [...mocks.enrollments.values()].find((item) => item.id === id);
      if (!value) throw notFound();
      return value;
    }),
    getFirstListItem: vi.fn(async (filter: { courseId: string; studentId: string }) => {
      const value = mocks.enrollments.get(filter.studentId);
      if (!value || value.course !== filter.courseId) throw notFound();
      return value;
    }),
    delete: vi.fn(async (id: string) => {
      mocks.serviceDelete(id);
      const entry = [...mocks.enrollments].find(([, value]) => value.id === id);
      if (entry) mocks.enrollments.delete(entry[0]);
      return true;
    }),
  };
  throw new Error(`Colección inesperada: ${name}, service=${service}`);
}

vi.mock('./pocketbase-server', () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { model: mocks.role ? { id: 'actor', role: mocks.role } : null },
    filter: (_expression: string, params: Record<string, string>) => params,
    collection: (name: string) => collection(name),
  })),
}));

vi.mock('./pocketbase-service', () => ({
  createServiceClient: vi.fn(async () => ({
    filter: (_expression: string, params: Record<string, string>) => params,
    collection: (name: string) => collection(name, true),
    createBatch: () => {
      const pending: Array<{ course: string; student: string }> = [];
      return {
        collection: () => ({ create: (data: { course: string; student: string }) => pending.push(data) }),
        send: async () => {
          mocks.batchSend(pending);
          if (mocks.batchFails) throw Object.assign(new Error('batch failed'), { status: 500 });
          for (const item of pending) mocks.enrollments.set(item.student, { id: `enrollment-${item.student}`, ...item });
          return [];
        },
      };
    },
  })),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { addCourseStudents, addCourseTeachers, removeCourseStudent, removeCourseTeacher } from './actions-course-participants';

describe('acciones administrativas de participantes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.role = 'admin';
    mocks.teachers = [];
    mocks.enrollments.clear();
    mocks.batchFails = false;
    mocks.skipTeacherWrite = false;
  });

  it.each(['docente', 'estudiante', ''])('rechaza altas sin privilegio admin (%s)', async (role) => {
    mocks.role = role;
    await expect(addCourseStudents('course-1', ['user-1'])).resolves.toMatchObject({ status: 'forbidden' });
    expect(mocks.batchSend).not.toHaveBeenCalled();
  });

  it('crea todas las matrículas en un único batch y verifica el resultado', async () => {
    const result = await addCourseStudents('course-1', ['user-1', 'user-2', 'user-1']);
    expect(result).toMatchObject({ status: 'success', affectedIds: ['user-1', 'user-2'] });
    expect(mocks.batchSend).toHaveBeenCalledTimes(1);
    expect(mocks.enrollments.size).toBe(2);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/estudiantes', 'layout');
  });

  it('rechaza el lote completo si una persona ya es docente del curso', async () => {
    mocks.teachers = ['teacher-1'];
    await expect(addCourseStudents('course-1', ['user-1', 'teacher-1'])).resolves.toMatchObject({ status: 'conflict' });
    expect(mocks.batchSend).not.toHaveBeenCalled();
    expect(mocks.enrollments.size).toBe(0);
  });

  it('rechaza identificadores de cuentas inexistentes antes de usar el servicio', async () => {
    await expect(addCourseStudents('course-1', ['manipulated-id'])).resolves.toMatchObject({ status: 'not-found' });
    expect(mocks.batchSend).not.toHaveBeenCalled();
  });

  it('no deja matrículas parciales cuando falla el batch', async () => {
    mocks.batchFails = true;
    await expect(addCourseStudents('course-1', ['user-1', 'user-2'])).resolves.toMatchObject({ status: 'error' });
    expect(mocks.enrollments.size).toBe(0);
  });

  it('rechaza asignar como docente a una persona matriculada sin afectar otros cursos', async () => {
    mocks.enrollments.set('student-1', { id: 'enrollment-1', course: 'course-1', student: 'student-1' });
    await expect(addCourseTeachers('course-1', ['student-1'])).resolves.toMatchObject({ status: 'conflict' });
    expect(mocks.serviceUpdate).not.toHaveBeenCalled();
  });

  it('permite enseñar en un curso y estudiar en otro', async () => {
    mocks.enrollments.set('student-1', { id: 'enrollment-other', course: 'course-2', student: 'student-1' });
    await expect(addCourseTeachers('course-1', ['student-1'])).resolves.toMatchObject({ status: 'success' });
    expect(mocks.enrollments.get('student-1')?.course).toBe('course-2');
  });

  it('informa conflicto si una escritura concurrente impide verificar docentes', async () => {
    mocks.skipTeacherWrite = true;
    await expect(addCourseTeachers('course-1', ['teacher-1'])).resolves.toMatchObject({ status: 'conflict' });
  });

  it('agrega y retira docentes mediante modificadores de relación verificados', async () => {
    await expect(addCourseTeachers('course-1', ['teacher-1'])).resolves.toMatchObject({ status: 'success' });
    expect(mocks.teachers).toEqual(['teacher-1']);
    await expect(removeCourseTeacher('course-1', 'teacher-1')).resolves.toMatchObject({ status: 'success' });
    expect(mocks.teachers).toEqual([]);
  });

  it('retira sólo la matrícula solicitada y conserva las demás', async () => {
    mocks.enrollments.set('student-1', { id: 'enrollment-1', course: 'course-1', student: 'student-1' });
    mocks.enrollments.set('user-2', { id: 'enrollment-2', course: 'course-1', student: 'user-2' });
    await expect(removeCourseStudent('course-1', 'enrollment-1')).resolves.toMatchObject({ status: 'success', affectedIds: ['student-1'] });
    expect(mocks.serviceDelete).toHaveBeenCalledWith('enrollment-1');
    expect(mocks.enrollments.has('user-2')).toBe(true);
  });

  it('no elimina datos si la matrícula indicada pertenece a otro curso', async () => {
    mocks.enrollments.set('student-1', { id: 'enrollment-1', course: 'course-2', student: 'student-1' });
    await expect(removeCourseStudent('course-1', 'enrollment-1')).resolves.toMatchObject({ status: 'not-found' });
    expect(mocks.serviceDelete).not.toHaveBeenCalled();
  });
});
