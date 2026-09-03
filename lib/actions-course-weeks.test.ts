import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  model: { id: 'teacher-1', role: 'docente' } as { id: string; role: string } | null,
  course: { id: 'course-1', teachers: ['teacher-1'], organizationMode: 'semanal' },
  week: { id: 'week-1', course: 'course-1', number: 1 },
  weeks: [] as Array<{ id: string; course: string; number: number }>,
  content: {
    classes: [{ id: 'class-1', course: 'course-1', week: 'week-1' }],
    assignments: [{ id: 'assignment-1', course: 'course-1', week: 'week-1' }],
    inquiries: [{ id: 'inquiry-1', course: 'course-1', week: 'week-1' }],
  } as Record<string, Array<{ id: string; course: string; week?: string }>>,
  createWeek: vi.fn(),
  update: vi.fn(),
  deleteWeek: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('./pocketbase-server', () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { get model() { return mocks.model; } },
    filter: (template: string) => template,
    collection: (name: string) => ({
      getOne: vi.fn(async (id: string) => {
        if (name === 'courses') return mocks.course;
        if (name === 'course_weeks') return { ...mocks.week, id };
        return mocks.content[name].find((item) => item.id === id);
      }),
      getFullList: vi.fn(async () => name === 'course_weeks' ? mocks.weeks : mocks.content[name] || []),
      create: name === 'course_weeks' ? mocks.createWeek : vi.fn(),
      update: vi.fn(async (id: string, data: Record<string, unknown>) => {
        mocks.update(name, id, data);
        const item = mocks.content[name]?.find((candidate) => candidate.id === id);
        if (item) Object.assign(item, data);
        return { id, ...data };
      }),
      delete: name === 'course_weeks' ? mocks.deleteWeek : vi.fn(),
    }),
  })),
}));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { assignContentToWeek, createCourseWeek, deleteCourseWeek } from './actions-course-weeks';

function weekForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({ number: '2', title: 'Semana 2', status: 'publicada', ...overrides })) form.set(key, value);
  return form;
}

describe('acciones docentes de semanas', () => {
  beforeEach(() => {
    mocks.model = { id: 'teacher-1', role: 'docente' };
    mocks.course = { id: 'course-1', teachers: ['teacher-1'], organizationMode: 'semanal' };
    mocks.week = { id: 'week-1', course: 'course-1', number: 1 };
    mocks.weeks = [];
    mocks.content = {
      classes: [{ id: 'class-1', course: 'course-1', week: 'week-1' }],
      assignments: [{ id: 'assignment-1', course: 'course-1', week: 'week-1' }],
      inquiries: [{ id: 'inquiry-1', course: 'course-1', week: 'week-1' }],
    };
    mocks.createWeek.mockReset().mockResolvedValue({ id: 'week-2' });
    mocks.update.mockReset();
    mocks.deleteWeek.mockReset();
    mocks.revalidatePath.mockReset();
  });

  it('crea y programa una semana válida para el docente asignado', async () => {
    const result = await createCourseWeek('course-1', weekForm({ status: 'programada', publishAt: '2026-08-10T12:00:00.000Z' }));
    expect(result).toEqual({ success: true, weekId: 'week-2' });
    expect(mocks.createWeek).toHaveBeenCalledWith(expect.objectContaining({ course: 'course-1', status: 'programada', publishAt: '2026-08-10T12:00:00.000Z' }));
  });

  it('deriva el permiso docente de la asignación aunque el rol heredado sea estudiante', async () => {
    mocks.model = { id: 'teacher-1', role: 'estudiante' };
    expect((await createCourseWeek('course-1', weekForm())).success).toBe(true);
  });

  it('rechaza números duplicados antes de escribir', async () => {
    mocks.weeks = [{ id: 'existing', course: 'course-1', number: 2 }];
    const result = await createCourseWeek('course-1', weekForm());
    expect(result.success).toBe(false);
    expect('errors' in result && result.errors?.number).toContain('Ya existe');
    expect(mocks.createWeek).not.toHaveBeenCalled();
  });

  it('rechaza docentes ajenos y duplicados concurrentes', async () => {
    mocks.course.teachers = ['teacher-2'];
    expect((await createCourseWeek('course-1', weekForm())).success).toBe(false);
    mocks.course.teachers = ['teacher-1'];
    mocks.createWeek.mockRejectedValue(Object.assign(new Error('duplicate'), { status: 400 }));
    const concurrent = await createCourseWeek('course-1', weekForm());
    expect('errors' in concurrent && concurrent.errors?.number).toContain('Ya existe');
  });

  it('impide asignar contenido o semanas de otro curso', async () => {
    mocks.week.course = 'course-2';
    const result = await assignContentToWeek('course-1', 'class', 'class-1', 'week-2');
    expect(result).toEqual({ success: false, error: 'La semana no pertenece a este curso' });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('elimina una semana después de desasignar todo su contenido', async () => {
    const result = await deleteCourseWeek('week-1');
    expect(result).toEqual({ success: true });
    for (const name of ['classes', 'assignments', 'inquiries']) {
      expect(mocks.update).toHaveBeenCalledWith(name, expect.any(String), { week: null });
    }
    expect(mocks.deleteWeek).toHaveBeenCalledWith('week-1');
  });
});
