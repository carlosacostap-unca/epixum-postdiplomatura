import { beforeEach, describe, expect, it } from 'vitest';
import type PocketBase from 'pocketbase';
import { commandCourseSurvey, listCourseSurveys, readCourseSurvey, readSurveyResults, requireSurveyAccess, saveCourseSurvey, submitCourseSurvey } from './course-survey-service';
import type { CourseSurvey } from './course-surveys';

const courseId = 'course000000001';
const surveyId = 'survey000000001';
const design = { title: 'Consulta', description: '', anonymous: true, closesAt: '', questions: [{ id: 'q', title: 'Opinión', type: 'text' as const, required: true, options: [] }] };
type Row = Record<string, unknown> & { id: string };
type Operation = { collection: string; method: string; id?: string; data?: Record<string, unknown> };

function fixture() {
  let db: Record<string, Row[]> = {
    courses: [{ id: courseId, title: 'Curso', status: 'en curso', surveysEnabled: true, teachers: ['teacher'] }],
    users: [{ id: 'student', name: 'Nombre privado' }],
    course_enrollments: [{ id: 'enrollment', course: courseId, student: 'student' }],
    course_surveys: [{ ...design, id: surveyId, course: courseId, status: 'published', revision: 'v1', opening: 'opening1' }],
    course_survey_openings: [{ id: 'opening1', survey: surveyId }],
    course_survey_participations: [], course_survey_responses: [], course_survey_revisions: [],
  };
  let seq = 0;
  let failNext = false;
  let beforeSend: (() => Promise<void>) | undefined;
  const matches = (row: Row, filter?: string) => {
    if (!filter) return true;
    const { expression, values } = JSON.parse(filter) as { expression: string; values: Record<string, string> };
    return Object.entries(values).every(([key, value]) => !(key in row) || row[key] === value) && (!expression.includes('status != "draft"') || row.status !== 'draft');
  };
  const missing = () => { throw { status: 404 }; };
  const collection = (name: string) => ({
    getOne: async (id: string) => structuredClone(db[name]?.find(row => row.id === id) || missing()),
    getFirstListItem: async (filter: string) => structuredClone(db[name]?.find(row => matches(row, filter)) || missing()),
    getFullList: async (options?: { filter?: string; expand?: string }) => structuredClone((db[name] || []).filter(row => matches(row, options?.filter)).map(row => options?.expand === 'student' ? { ...row, expand: { student: db.users.find(user => user.id === row.student) } } : row)),
    getList: async (_page: number, _limit: number, options?: { filter?: string }) => ({ totalItems: (db[name] || []).filter(row => matches(row, options?.filter)).length }),
    create: async (data: Record<string, unknown>) => { const row = { ...data, id: `new${++seq}` }; db[name].push(row); return structuredClone(row); },
  });
  const service = {
    collection,
    filter: (expression: string, values: unknown) => JSON.stringify({ expression, values }),
    createBatch: () => {
      const ops: Operation[] = [];
      return {
        collection: (name: string) => ({
          create: (data: Record<string, unknown>) => ops.push({ collection: name, method: 'create', data }),
          update: (id: string, data: Record<string, unknown>) => ops.push({ collection: name, method: 'update', id, data }),
          delete: (id: string) => ops.push({ collection: name, method: 'delete', id }),
        }),
        send: async () => {
          if (beforeSend) { const callback = beforeSend; beforeSend = undefined; await callback(); }
          const next = structuredClone(db);
          for (const op of ops) {
            const rows = next[op.collection];
            if (op.method === 'create') {
              const data = op.data!;
              const unique = op.collection === 'course_survey_revisions' ? 'revision' : op.collection === 'course_survey_participations' ? 'student' : null;
              if (unique && rows.some(row => row.survey === data.survey && row[unique] === data[unique])) throw new Error('Unique constraint');
              if (op.collection === 'course_survey_responses' && !next.course_survey_openings.some(row => row.id === data.opening)) throw new Error('Missing opening relation');
              rows.push({ ...data, id: String(data.id || `new${++seq}`) });
            } else {
              const index = rows.findIndex(row => row.id === op.id);
              if (index < 0) missing();
              if (op.method === 'delete') {
                rows.splice(index, 1);
                if (op.collection === 'course_survey_openings') for (const response of next.course_survey_responses) if (response.opening === op.id) response.opening = '';
              }
              else rows[index] = { ...rows[index], ...op.data };
            }
          }
          if (failNext) { failNext = false; throw new Error('Transaction failed'); }
          db = next;
          return [];
        },
      };
    },
  } as unknown as PocketBase;
  const actor = (id: string, role = 'estudiante', valid = true) => ({ ...service, authStore: { isValid: valid, record: { id, role } } }) as unknown as PocketBase;
  return { service, actor, rows: (name: string) => db[name], survey: () => db.course_surveys[0] as unknown as CourseSurvey, fail: () => { failNext = true; }, before: (callback: () => Promise<void>) => { beforeSend = callback; } };
}

describe('servicio de encuestas', () => {
  let f: ReturnType<typeof fixture>;
  beforeEach(() => { f = fixture(); });
  it('autoriza docentes por asignación contextual y administradores', async () => {
    await expect(requireSurveyAccess(f.actor('teacher'), courseId, 'manager')).resolves.toBeTruthy();
    await expect(requireSurveyAccess(f.actor('admin', 'admin'), courseId, 'manager')).resolves.toBeTruthy();
    await expect(requireSurveyAccess(f.actor('outsider', 'docente'), courseId, 'manager')).rejects.toThrow('permisos');
    await expect(requireSurveyAccess(f.actor('teacher'), courseId, 'student')).rejects.toThrow('estudiantil');
    await expect(requireSurveyAccess(f.actor('student', 'docente'), courseId, 'student')).resolves.toBeTruthy();
  });
  it('rechaza sesión inválida, alumno no matriculado, curso borrador y función deshabilitada', async () => {
    await expect(requireSurveyAccess(f.actor('student', 'estudiante', false), courseId, 'student')).rejects.toThrow('sesión');
    await expect(requireSurveyAccess(f.actor('outsider'), courseId, 'student')).rejects.toThrow('matrícula');
    f.rows('courses')[0].status = 'borrador';
    await expect(requireSurveyAccess(f.actor('student'), courseId, 'student')).rejects.toThrow('estudiantil');
    f.rows('courses')[0].surveysEnabled = false;
    await expect(requireSurveyAccess(f.actor('admin', 'admin'), courseId, 'manager')).rejects.toThrow('habilitadas');
  });
  it('oculta borradores y rechaza IDs de encuestas de otro curso', async () => {
    f.survey().status = 'draft';
    const data = await listCourseSurveys(f.actor('student'), f.service, courseId, 'student');
    expect(data.surveys).toEqual([]);
    await expect(readCourseSurvey(f.actor('student'), f.service, courseId, surveyId, 'student')).rejects.toThrow('disponible');
    f.survey().course = 'another';
    await expect(readCourseSurvey(f.actor('teacher'), f.service, courseId, surveyId, 'manager')).rejects.toThrow('disponible');
  });
  it('conserva una participación y una respuesta ante envíos concurrentes', async () => {
    await Promise.all(Array.from({ length: 3 }, () => submitCourseSurvey(f.actor('student'), f.service, courseId, surveyId, { q: 'Bien' })));
    expect(f.rows('course_survey_participations')).toHaveLength(1);
    expect(f.rows('course_survey_responses')).toHaveLength(1);
    expect(f.rows('course_survey_responses')[0]).not.toHaveProperty('student');
    expect(f.rows('course_survey_responses')[0]).not.toHaveProperty('created');
  });
  it('revierte una transacción fallida y reintenta sin perder ni duplicar respuestas', async () => {
    f.fail();
    await submitCourseSurvey(f.actor('student'), f.service, courseId, surveyId, { q: 'Bien' });
    expect(f.rows('course_survey_participations')).toHaveLength(1);
    expect(f.rows('course_survey_responses')).toHaveLength(1);
    expect(f.rows('course_survey_revisions')).toHaveLength(0);
  });
  it('registra identidad solamente en modalidad identificada', async () => {
    f.survey().anonymous = false;
    await submitCourseSurvey(f.actor('student'), f.service, courseId, surveyId, { q: 'Bien' });
    expect(f.rows('course_survey_responses')[0].student).toBe('student');
    const results = await readSurveyResults(f.actor('teacher'), f.service, courseId, surveyId);
    expect(results.individuals).toEqual([{ name: 'Nombre privado', answers: { q: 'Bien' } }]);
  });
  it('no devuelve identidades ni respuestas enlazadas en resultados anónimos', async () => {
    await submitCourseSurvey(f.actor('student'), f.service, courseId, surveyId, { q: 'Texto' });
    const results = await readSurveyResults(f.actor('teacher'), f.service, courseId, surveyId);
    expect(results.individuals).toEqual([]);
    expect(JSON.stringify(results)).not.toMatch(/Nombre privado|student|revision|created|updated/);
    await expect(readSurveyResults(f.actor('student'), f.service, courseId, surveyId)).rejects.toThrow('permisos');
  });
  it('rechaza entradas inválidas, cierres manuales y fechas cumplidas sin escrituras', async () => {
    await expect(submitCourseSurvey(f.actor('student'), f.service, courseId, surveyId, {})).rejects.toThrow('Opinión');
    f.survey().closesAt = '2000-01-01T00:00:00Z';
    await expect(submitCourseSurvey(f.actor('student'), f.service, courseId, surveyId, { q: 'Bien' })).rejects.toThrow('cerrada');
    f.survey().closesAt = ''; f.survey().status = 'closed';
    await expect(submitCourseSurvey(f.actor('student'), f.service, courseId, surveyId, { q: 'Bien' })).rejects.toThrow('cerrada');
    expect(f.rows('course_survey_participations')).toHaveLength(0);
  });
  it('un cierre que gana la transacción impide aceptar un envío en vuelo', async () => {
    f.before(async () => { await commandCourseSurvey(f.actor('teacher'), f.service, courseId, surveyId, 'close', ''); });
    await expect(submitCourseSurvey(f.actor('student'), f.service, courseId, surveyId, { q: 'Tardía' })).rejects.toThrow('cerrada');
    expect(f.rows('course_survey_responses')).toHaveLength(0);
  });
  it('el cierre conserva un envío que gana primero', async () => {
    f.before(async () => { await submitCourseSurvey(f.actor('student'), f.service, courseId, surveyId, { q: 'A tiempo' }); });
    await commandCourseSurvey(f.actor('teacher'), f.service, courseId, surveyId, 'close', '');
    expect(f.survey().status).toBe('closed');
    expect(f.rows('course_survey_responses')).toHaveLength(1);
  });
  it('acepta alumnos distintos concurrentes sin competir por revisiones compartidas', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `student-${i}`);
    for (const student of ids) f.rows('course_enrollments').push({ id: `enrollment-${student}`, course: courseId, student });
    await Promise.all(ids.map(id => submitCourseSurvey(f.actor(id), f.service, courseId, surveyId, { q: `Respuesta ${id}` })));
    expect(f.rows('course_survey_responses')).toHaveLength(20);
    expect(f.rows('course_survey_participations')).toHaveLength(20);
    expect(f.rows('course_survey_revisions')).toHaveLength(0);
  });
  it('bloquea edición de publicadas, permite duplicarlas y elimina solo borradores', async () => {
    const teacher = f.actor('teacher');
    await expect(saveCourseSurvey(teacher, f.service, courseId, surveyId, 'v1', design)).rejects.toThrow('publicado');
    await expect(commandCourseSurvey(teacher, f.service, courseId, surveyId, 'delete', 'v1')).rejects.toThrow('estado');
    const copy = await commandCourseSurvey(teacher, f.service, courseId, surveyId, 'duplicate', 'v1');
    const copied = f.rows('course_surveys').find(row => row.id === copy)!;
    expect(copied).toMatchObject({ status: 'draft', title: 'Consulta (copia)', closesAt: '' });
    await commandCourseSurvey(teacher, f.service, courseId, copy, 'delete', copied.revision as string);
    expect(f.rows('course_surveys')).toHaveLength(1);
  });
  it('rechaza ediciones obsoletas y publicaciones con fecha pasada', async () => {
    f.survey().status = 'draft';
    const teacher = f.actor('teacher');
    await expect(saveCourseSurvey(teacher, f.service, courseId, surveyId, 'old', design)).rejects.toThrow('cambió');
    f.survey().closesAt = '2000-01-01T00:00:00Z';
    await expect(commandCourseSurvey(teacher, f.service, courseId, surveyId, 'publish', 'v1')).rejects.toThrow('futuro');
    f.survey().closesAt = '';
    await commandCourseSurvey(teacher, f.service, courseId, surveyId, 'publish', 'v1');
    expect(f.survey().status).toBe('published');
  });
  it('una publicación concurrente impide guardar un diseño antiguo sobre la encuesta publicada', async () => {
    f.survey().status = 'draft';
    const teacher = f.actor('teacher');
    f.before(async () => { await commandCourseSurvey(teacher, f.service, courseId, surveyId, 'publish', 'v1'); });
    await expect(saveCourseSurvey(teacher, f.service, courseId, surveyId, 'v1', { ...design, title: 'Cambio tardío' })).rejects.toThrow('cambió');
    expect(f.survey()).toMatchObject({ status: 'published', title: 'Consulta' });
  });
});
