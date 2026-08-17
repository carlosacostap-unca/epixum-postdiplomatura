import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pb: null as ReturnType<typeof buildPocketBase> | null,
  revalidatePath: vi.fn(),
}));

vi.mock('./pocketbase-server', () => ({ createServerClient: vi.fn(async () => mocks.pb) }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { createCourseContent, deleteCourseContent, reorderCourseContents, updateCourseContent } from './actions-course-content';
import { requireEnabledStudentCourse } from './course-content-access';
import { getCourseContents, getCourseContentWithResources } from './course-content-data';

function buildPocketBase({ role = 'docente', userId = 'teacher-1', enabled = true } = {}) {
  const state = {
    courses: [
      { id: 'course-1', title: 'Curso', teachers: ['teacher-1'], contentsEnabled: enabled },
      { id: 'course-2', title: 'Otro', teachers: ['teacher-2'], contentsEnabled: true },
    ],
    course_contents: [
      { id: 'content-b', course: 'course-1', title: 'B', description: '', position: 1, created: '2026-01-02' },
      { id: 'content-a', course: 'course-1', title: 'A', description: '', position: 0, created: '2026-01-01' },
      { id: 'content-other', course: 'course-2', title: 'Otro', description: '', position: 0, created: '2026-01-01' },
    ],
    links: [
      { id: 'link-1', content: 'content-a', title: 'Guía', url: 'https://example.com', type: 'link', created: '2026-01-01' },
    ],
    course_enrollments: [{ id: 'enrollment-1', course: 'course-1', student: 'student-1' }],
  };
  const batchUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];

  const filterValues = (options?: { filter?: string }) => {
    try { return JSON.parse(options?.filter || '{}') as Record<string, string>; } catch { return {}; }
  };

  const pb = {
    state,
    batchUpdates,
    authStore: { model: role ? { id: userId, role } : null },
    filter: (_template: string, values: Record<string, string>) => JSON.stringify(values),
    collection(name: keyof typeof state) {
      return {
        async getOne(id: string) {
          const record = state[name].find((candidate) => candidate.id === id);
          if (!record) throw new Error('not found');
          return structuredClone(record);
        },
        async getFullList(options?: { filter?: string }) {
          const values = filterValues(options);
          return structuredClone(state[name].filter((record) =>
            (!values.course || ('course' in record && record.course === values.course)) &&
            (!values.content || ('content' in record && record.content === values.content))));
        },
        async getFirstListItem(filter: string) {
          const values = filterValues({ filter });
          const record = state[name].find((candidate) =>
            (!values.course || ('course' in candidate && candidate.course === values.course)) &&
            (!values.student || ('student' in candidate && candidate.student === values.student)));
          if (!record) throw new Error('not found');
          return structuredClone(record);
        },
        async create(data: Record<string, unknown>) {
          const record = { id: `content-${state.course_contents.length + 1}`, created: '2026-01-03', ...data } as never;
          state[name].push(record);
          return structuredClone(record);
        },
        async update(id: string, data: Record<string, unknown>) {
          const record = state[name].find((candidate) => candidate.id === id);
          if (!record) throw new Error('not found');
          Object.assign(record, data);
          if (name === 'course_contents') batchUpdates.push({ id, data });
          return structuredClone(record);
        },
        async delete(id: string) {
          const index = state[name].findIndex((candidate) => candidate.id === id);
          if (index < 0) throw new Error('not found');
          state[name].splice(index, 1);
          return true;
        },
      };
    },
  };
  return pb;
}

function form(title = 'Introducción', description = '<p>Texto</p>') {
  const data = new FormData();
  data.set('title', title);
  data.set('description', description);
  return data;
}

describe('contenidos de curso', () => {
  beforeEach(() => {
    mocks.pb = buildPocketBase();
    mocks.revalidatePath.mockReset();
  });

  it('consulta solamente el curso pedido, ordena y carga recursos explícitamente', async () => {
    const contents = await getCourseContents('course-1');
    expect(contents.map((item) => item.id)).toEqual(['content-a', 'content-b']);
    await expect(getCourseContentWithResources('course-1', 'content-a')).resolves.toMatchObject({
      content: { id: 'content-a' },
      links: [{ id: 'link-1' }],
    });
    await expect(getCourseContentWithResources('course-1', 'content-other')).resolves.toBeNull();
  });

  it('crea al final con visibilidad inmediata y actualiza sólo dentro del curso', async () => {
    const created = await createCourseContent('course-1', form('  Nuevo  '));
    expect(created).toEqual({ success: true, contentId: 'content-4' });
    expect(mocks.pb?.state.course_contents.find((item) => item.id === 'content-4')).toMatchObject({ title: 'Nuevo', position: 2 });

    await expect(updateCourseContent('course-1', 'content-a', form('Actualizado'))).resolves.toEqual({ success: true, contentId: 'content-a' });
    expect(mocks.pb?.state.course_contents.find((item) => item.id === 'content-a')?.title).toBe('Actualizado');
    await expect(updateCourseContent('course-1', 'content-other', form())).resolves.toMatchObject({ success: false, error: expect.stringContaining('no pertenece') });
  });

  it('rechaza curso deshabilitado y docente ajeno', async () => {
    mocks.pb = buildPocketBase({ enabled: false });
    await expect(createCourseContent('course-1', form())).resolves.toMatchObject({ success: false });
    mocks.pb = buildPocketBase({ userId: 'teacher-2' });
    await expect(createCourseContent('course-1', form())).resolves.toMatchObject({ success: false });
  });

  it('reordena una permutación completa y rechaza listas manipuladas', async () => {
    await expect(reorderCourseContents('course-1', ['content-b', 'content-a'])).resolves.toEqual({ success: true });
    expect(mocks.pb?.batchUpdates).toEqual([
      { id: 'content-b', data: { position: 0 } },
      { id: 'content-a', data: { position: 1 } },
    ]);
    mocks.pb!.batchUpdates.length = 0;
    await expect(reorderCourseContents('course-1', ['content-a', 'content-other'])).resolves.toMatchObject({ success: false });
    expect(mocks.pb?.batchUpdates).toEqual([]);
  });

  it('elimina y normaliza las posiciones restantes', async () => {
    await expect(deleteCourseContent('course-1', 'content-a')).resolves.toEqual({ success: true });
    expect(mocks.pb?.state.course_contents.find((item) => item.id === 'content-b')?.position).toBe(0);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/estudiantes/cursos/course-1/contenidos');
  });

  it('valida matrícula estudiantil además de la habilitación', async () => {
    mocks.pb = buildPocketBase({ role: 'estudiante', userId: 'student-1' });
    await expect(requireEnabledStudentCourse(mocks.pb as never, mocks.pb.authStore.model as never, 'course-1')).resolves.toMatchObject({ id: 'course-1' });
    mocks.pb = buildPocketBase({ role: 'estudiante', userId: 'student-2' });
    await expect(requireEnabledStudentCourse(mocks.pb as never, mocks.pb.authStore.model as never, 'course-1')).rejects.toThrow();
  });
});
