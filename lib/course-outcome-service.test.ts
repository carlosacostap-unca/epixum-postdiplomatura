import { beforeEach, describe, expect, it } from 'vitest';
import type PocketBase from 'pocketbase';
import { changeCourseOutcome, readManagedCourseOutcome, readOwnCourseOutcome, requireOutcomeCourse } from './course-outcome-service';
import type { CourseOutcome } from './course-outcomes';

const courseId = 'course000000001';
const draft = { status: 'aprobado' as const, grade: 8, feedback: 'Buen trabajo' };
type Row = Record<string, unknown> & { id: string };
function fixture() {
  let db: Record<string, Row[]> = { courses: [{ id: courseId, status: 'en curso', outcomesEnabled: true, teachers: ['teacher'] }], users: [{ id: 'student', name: 'Alumno A' }, { id: 'second', name: 'Alumno B' }], course_enrollments: [{ id: 'en1', course: courseId, student: 'student' }, { id: 'en2', course: courseId, student: 'second' }], course_outcomes: [], course_outcome_history: [] };
  let sequence = 0; let failNext = false;
  const reads: { collection: string; fields?: string; filter?: string }[] = [];
  const missing = () => { throw { status: 404 }; };
  const match = (row: Row, filter?: string) => !filter || Object.entries(JSON.parse(filter).values as Record<string, string>).every(([key, value]) => row[key] === value);
  const project = (row: Row, fields?: string) => fields ? Object.fromEntries(fields.split(',').map(key => [key, row[key]])) : row;
  const service = {
    filter: (expression: string, values: unknown) => JSON.stringify({ expression, values }),
    collection: (name: string) => ({
      getOne: async (id: string, options?: { fields?: string }) => structuredClone(project(db[name].find(r => r.id === id) || missing(), options?.fields)),
      getFirstListItem: async (filter: string, options?: { fields?: string }) => { reads.push({ collection: name, fields: options?.fields, filter }); return structuredClone(project(db[name].find(r => match(r, filter)) || missing(), options?.fields)); },
      getList: async (page: number, limit: number, options?: { fields?: string; filter?: string }) => {
        const all = db[name].filter(r => match(r, options?.filter));
        return { page, totalPages: Math.ceil(all.length / limit), totalItems: all.length, items: all.slice((page - 1) * limit, page * limit).map(r => structuredClone(project(r, options?.fields))) };
      },
    }),
    createBatch: () => {
      const operations: { name: string; id?: string; data: Record<string, unknown> }[] = [];
      return { collection: (name: string) => ({
        create: (data: Record<string, unknown>) => operations.push({ name, data }),
        update: (id: string, data: Record<string, unknown>) => operations.push({ name, id, data }),
      }), send: async () => {
        const next = structuredClone(db);
        for (const op of operations) {
          const rows = next[op.name];
          if (op.id) {
            const index = rows.findIndex(r => r.id === op.id); if (index < 0) missing();
            rows[index] = { ...rows[index], ...op.data };
          } else {
            const unique = op.name === 'course_outcomes' ? ['course', 'student'] : ['outcome', 'revision'];
            if (rows.some(row => unique.every(key => row[key] === op.data[key]))) throw new Error('Unique constraint');
            rows.push({ ...op.data, id: String(op.data.id || `row${++sequence}`) });
          }
        }
        if (failNext) { failNext = false; throw new Error('Database failure'); }
        db = next;
      } };
    },
  } as unknown as PocketBase;
  return { service, reads, rows: (name: string) => db[name], actor: (id: string, role = 'estudiante', valid = true) => ({ ...service, authStore: { isValid: valid, record: { id, role, name: 'Docente de prueba' } } }) as unknown as PocketBase, current: () => db.course_outcomes[0] as unknown as CourseOutcome, fail: () => { failNext = true; } };
}
describe('servicio privado de resultados de cursada', () => {
  let f: ReturnType<typeof fixture>;
  beforeEach(() => { f = fixture(); });
  const save = async (f: ReturnType<typeof fixture>, input: unknown = draft) => changeCourseOutcome(f.actor('teacher'), f.service, courseId, 'student', f.current()?.revision || '', 'save', input);
  const command = async (f: ReturnType<typeof fixture>, op: 'publish' | 'withdraw') => changeCourseOutcome(f.actor('teacher'), f.service, courseId, 'student', f.current().revision, op);
  it('autoriza por asignación contextual y administración, sin exigir rol global docente', async () => {
    await expect(requireOutcomeCourse(f.actor('teacher'), courseId)).resolves.toBeTruthy();
    await expect(requireOutcomeCourse(f.actor('admin', 'admin'), courseId)).resolves.toBeTruthy();
    await expect(requireOutcomeCourse(f.actor('outsider', 'docente'), courseId)).rejects.toThrow('permisos');
    await expect(requireOutcomeCourse(f.actor('student'), courseId)).rejects.toThrow('permisos');
    await expect(requireOutcomeCourse(f.actor('student', 'estudiante', false), courseId)).rejects.toThrow('sesión');
  });
  it('rechaza alumnos sin matrícula, docentes del mismo curso y cursos borrador', async () => {
    await expect(requireOutcomeCourse(f.actor('outsider'), courseId, 'student')).rejects.toThrow('matrícula');
    await expect(changeCourseOutcome(f.actor('teacher'), f.service, courseId, 'outsider', '', 'save', draft)).rejects.toThrow('matrícula');
    await expect(changeCourseOutcome(f.actor('teacher'), f.service, courseId, 'teacher', '', 'save', draft)).rejects.toThrow('docente');
    f.rows('courses')[0].status = 'borrador';
    await expect(readOwnCourseOutcome(f.actor('student'), f.service, courseId)).rejects.toThrow('estudiantil');
    expect(f.rows('course_outcomes')).toHaveLength(0);
  });
  it('guarda borradores y publica solo para el alumno correspondiente', async () => {
    await save(f);
    expect(await readOwnCourseOutcome(f.actor('student'), f.service, courseId)).toBeNull();
    await command(f, 'publish');
    expect(await readOwnCourseOutcome(f.actor('student'), f.service, courseId)).toMatchObject(draft);
    expect(await readOwnCourseOutcome(f.actor('second'), f.service, courseId)).toBeNull();
    expect(f.reads.filter(r => r.collection === 'course_outcomes').at(-1)?.fields).toBe('published');
    await expect(readManagedCourseOutcome(f.actor('student'), f.service, courseId, 'second')).rejects.toThrow('permisos');
  });
  it('una corrección no se muestra hasta publicarse y admite quitar la nota', async () => {
    await save(f); await command(f, 'publish');
    await save(f, { status: 'no_completo', grade: null, feedback: '' });
    expect(await readOwnCourseOutcome(f.actor('student'), f.service, courseId)).toMatchObject(draft);
    await command(f, 'publish');
    expect(await readOwnCourseOutcome(f.actor('student'), f.service, courseId)).toMatchObject({ status: 'no_completo', grade: null, feedback: '' });
    expect(f.rows('course_outcome_history')).toHaveLength(4);
  });
  it('retira una publicación conservando borrador e historial de autoría', async () => {
    await save(f); await command(f, 'publish'); await command(f, 'withdraw');
    expect(await readOwnCourseOutcome(f.actor('student'), f.service, courseId)).toBeNull();
    expect(f.current().draft).toEqual(draft);
    const history = f.rows('course_outcome_history');
    expect(history).toHaveLength(3);
    expect(history[2]).toMatchObject({ action: 'withdraw', actor: 'teacher', actorName: 'Docente de prueba', snapshot: { draft, published: null } });
    expect(history[2].occurredAt).toMatch(/^\d{4}-/);
  });
  it('no acepta publicaciones sin borrador ni revisiones viejas', async () => {
    await expect(changeCourseOutcome(f.actor('teacher'), f.service, courseId, 'student', '', 'publish')).rejects.toThrow('borrador');
    await save(f);
    await expect(changeCourseOutcome(f.actor('teacher'), f.service, courseId, 'student', 'old', 'save', draft)).rejects.toThrow('cambió');
  });
  it('rechaza datos inválidos sin guardar resultado o historial', async () => {
    await expect(save(f, { ...draft, grade: 11 })).rejects.toThrow('0 y 10');
    await expect(save(f, { ...draft, status: 'regular' })).rejects.toThrow('Elegí');
    expect(f.rows('course_outcomes')).toHaveLength(0); expect(f.rows('course_outcome_history')).toHaveLength(0);
  });
  it('deshabilitar o retirar matrícula revoca acceso sin borrar datos', async () => {
    await save(f); await command(f, 'publish');
    f.rows('courses')[0].outcomesEnabled = false;
    await expect(readOwnCourseOutcome(f.actor('student'), f.service, courseId)).rejects.toThrow('habilitados');
    await expect(save(f)).rejects.toThrow('habilitados');
    f.rows('courses')[0].outcomesEnabled = true;
    f.rows('course_enrollments').splice(0, 1);
    await expect(readOwnCourseOutcome(f.actor('student'), f.service, courseId)).rejects.toThrow('matrícula');
    await expect(save(f)).rejects.toThrow('matrícula');
    expect(f.rows('course_outcomes')).toHaveLength(1); expect(f.rows('course_outcome_history')).toHaveLength(2);
  });
  it('dos altas simultáneas conservan un resultado y una entrada de historial', async () => {
    const attempts = await Promise.allSettled([save(f), save(f)]);
    expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(f.rows('course_outcomes')).toHaveLength(1); expect(f.rows('course_outcome_history')).toHaveLength(1);
  });
  it('dos cambios de una misma revisión no se sobrescriben silenciosamente', async () => {
    await save(f);
    const revision = f.current().revision;
    const attempts = await Promise.allSettled([1, 2].map(grade => changeCourseOutcome(f.actor('teacher'), f.service, courseId, 'student', revision, 'save', { ...draft, grade })));
    expect(attempts.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(f.rows('course_outcome_history')).toHaveLength(2);
    expect(f.current().draft.grade).toBe(1);
  });
  it('revierte el resultado si falla la confirmación del historial', async () => {
    await save(f);
    const before = structuredClone(f.current()); f.fail();
    await expect(save(f, { ...draft, grade: 9 })).rejects.toThrow('cambió');
    expect(f.current()).toEqual(before); expect(f.rows('course_outcome_history')).toHaveLength(1);
  });
});
