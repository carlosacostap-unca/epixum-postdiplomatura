import { beforeEach, describe, expect, it, vi } from 'vitest';
import example from '@/public/interactive-class-example.json';

const mocks = vi.hoisted(() => ({ pb: null as ReturnType<typeof fakeClient> | null, revalidatePath: vi.fn() }));
vi.mock('./pocketbase-server', () => ({ createServerClient: async () => mocks.pb }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { deleteInteractiveLesson, saveInteractiveLesson } from './actions-interactive-classes';
import { getInteractiveLesson, getInteractiveLessons } from './interactive-class-data';

function fakeClient(userId = 'teacher', enabled = true, isValid = true) {
  const course = { id: 'course-1', teachers: ['teacher'], interactiveClassesEnabled: enabled };
  const lesson = { id: 'lesson-1', course: 'course-1', title: 'Antes', material: example, class: 'class-1', status: 'draft' };
  const create = vi.fn(async (data) => ({ ...data, id: 'created' }));
  const update = vi.fn(async (id, data) => ({ ...data, id }));
  const remove = vi.fn(async () => true);
  const getList = vi.fn(async () => ({ items: [], totalItems: 0 }));
  return {
    course, lesson, create, update, remove, getList,
    authStore: { record: userId ? { id: userId, role: 'estudiante' } : null, isValid },
    filter: (filter: string, values: Record<string, string>) => `${filter} ${JSON.stringify(values)}`,
    collection: (name: string) => ({
      create, update, delete: remove, getList,
      getOne: async (id: string) => name === 'courses' ? course : name === 'interactive_lessons' ? lesson : { id, course: id === 'foreign' ? 'course-2' : 'course-1' },
    }),
  };
}

function form(status = 'draft', classId = '') {
  const data = new FormData();
  data.set('title', 'Nueva clase'); data.set('class', classId); data.set('status', status);
  if (status === 'ready') data.set('material', JSON.stringify(example));
  return data;
}

describe('gestión docente de clases interactivas', () => {
  beforeEach(() => { mocks.pb = fakeClient(); mocks.revalidatePath.mockReset(); });
  it('guarda los guiones separados del material y los recupera para el docente', async () => {
    const data = form('ready', 'class-1');
    const annotated = { ...example, screens: example.screens.map(s => ({ ...s, teacherNotes: `Guion ${s.id}` })) };
    data.set('material', JSON.stringify(annotated));
    expect(await saveInteractiveLesson('course-1', 'lesson-1', data)).toMatchObject({ success: true });
    const stored = mocks.pb!.update.mock.calls[0][1];
    expect(JSON.stringify(stored.material)).not.toContain('teacherNotes');
    expect(stored.teacherNotes[example.screens[0].id]).toBe(`Guion ${example.screens[0].id}`);
    Object.assign(mocks.pb!.lesson, stored);
    const loaded = await getInteractiveLesson('course-1', 'lesson-1');
    expect(loaded.material?.screens[0].teacherNotes).toBe(`Guion ${example.screens[0].id}`);
  });
  it('permite al docente contextual crear borradores y preparar una clase propia', async () => {
    expect(await saveInteractiveLesson('course-1', null, form())).toEqual({ success: true, lessonId: 'created' });
    expect(mocks.pb!.create).toHaveBeenCalledWith(expect.objectContaining({ course: 'course-1', material: null, status: 'draft' }));
    expect(await saveInteractiveLesson('course-1', 'lesson-1', form('ready', 'class-1'))).toEqual({ success: true, lessonId: 'lesson-1' });
    expect(mocks.pb!.update.mock.calls[0][1]).not.toHaveProperty('course');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/docentes/cursos/course-1', 'layout');
  });
  it.each([['outsider', true, true], ['student', true, true], ['teacher', false, true], ['', true, false], ['teacher', true, false]] as const)('bloquea lectura y mutación para usuario=%s habilitado=%s sesión=%s', async (user, enabled, valid) => {
    mocks.pb = fakeClient(user, enabled, valid);
    expect(await saveInteractiveLesson('course-1', null, form())).toMatchObject({ success: false });
    expect(await deleteInteractiveLesson('course-1', 'lesson-1')).toMatchObject({ success: false });
    await expect(getInteractiveLesson('course-1', 'lesson-1')).rejects.toThrow();
    expect(mocks.pb!.create).not.toHaveBeenCalled(); expect(mocks.pb!.remove).not.toHaveBeenCalled();
  });
  it('no acepta una clase habitual ajena ni una entrada de otro curso', async () => {
    expect(await saveInteractiveLesson('course-1', null, form('ready', 'foreign'))).toMatchObject({ success: false, error: expect.stringContaining('mismo curso') });
    mocks.pb!.lesson.course = 'course-2';
    expect(await saveInteractiveLesson('course-1', 'lesson-1', form())).toMatchObject({ success: false });
    expect(await deleteInteractiveLesson('course-1', 'lesson-1')).toMatchObject({ success: false });
    expect(mocks.pb!.update).not.toHaveBeenCalled(); expect(mocks.pb!.remove).not.toHaveBeenCalled();
  });
  it('rechaza contenido malformado sin sobrescribir lo guardado', async () => {
    const data = form(); data.set('material', '{');
    expect(await saveInteractiveLesson('course-1', 'lesson-1', data)).toMatchObject({ success: false });
    expect(mocks.pb!.update).not.toHaveBeenCalled();
  });
  it('filtra y pagina la biblioteca por habilitación y asignación', async () => {
    await getInteractiveLessons({ page: 2 });
    expect(mocks.pb!.getList).toHaveBeenCalledWith(2, 20, expect.objectContaining({ filter: expect.stringContaining('course.teachers.id ?=') }));
    await expect(getInteractiveLessons({ courseId: 'course-1', classId: 'foreign' })).rejects.toThrow();
  });
  it('elimina una entrada propia sin borrar su clase', async () => {
    expect(await deleteInteractiveLesson('course-1', 'lesson-1')).toEqual({ success: true });
    expect(mocks.pb!.remove).toHaveBeenCalledExactlyOnceWith('lesson-1');
  });
});
