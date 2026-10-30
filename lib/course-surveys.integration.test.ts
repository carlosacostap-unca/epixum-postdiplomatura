// @vitest-environment node
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { commandCourseSurvey, listCourseSurveys, readCourseSurvey, readSurveyResults, requireSurveyAccess, saveCourseSurvey, submitCourseSurvey } from './course-survey-service';

const enabled = process.env.RUN_COURSE_SURVEY_INTEGRATION === 'true';
describe.skipIf(!enabled)('encuestas: PocketBase real con datos temporales', () => {
  let service: PocketBase;
  let teacher: PocketBase;
  let student: PocketBase;
  let secondStudent: PocketBase;
  let outsider: PocketBase;
  let admin: PocketBase;
  let course = '';
  let survey = '';
  let revision = '';
  const created: { collection: string; id: string }[] = [];
  const design = { title: 'Consulta de prueba', description: 'Datos temporales', anonymous: true, closesAt: '', questions: [{ id: 'q', title: 'Opinión', type: 'text' as const, required: true, options: [] }] };
  beforeAll(async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    service = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
    service.autoCancellation(false);
    await service.health.check();
    await service.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || '', process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || '');
    const run = randomUUID().slice(0, 8);
    async function user(label: string, role = 'estudiante') {
      const password = `Surveys-${randomUUID()}!`;
      const record = await service.collection('users').create({ email: `survey-${run}-${label}@example.invalid`, name: `Prueba encuestas ${label}`, password, passwordConfirm: password, verified: true, role });
      created.push({ collection: 'users', id: record.id });
      const pb = new PocketBase(service.baseURL); pb.autoCancellation(false);
      await pb.collection('users').authWithPassword(record.email, password);
      return pb;
    }
    teacher = await user('docente'); student = await user('alumno'); secondStudent = await user('alumno2'); outsider = await user('externo', 'docente'); admin = await user('admin', 'admin');
    const record = await service.collection('courses').create({ title: `Prueba encuestas ${run}`, description: 'Curso temporal', status: 'en curso', surveysEnabled: true, teachers: [teacher.authStore.record!.id] });
    course = record.id; created.push({ collection: 'courses', id: course });
    for (const pb of [student, secondStudent]) await service.collection('course_enrollments').create({ course, student: pb.authStore.record!.id });
  }, 60000);
  afterAll(async () => {
    const failed: string[] = [];
    for (const record of [...created].reverse()) {
      try { await service.collection(record.collection).delete(record.id); }
      catch (error) { if (!(error && typeof error === 'object' && 'status' in error && error.status === 404)) failed.push(`${record.collection}/${record.id}`); }
    }
    if (failed.length) throw new Error(`No se pudieron limpiar los datos temporales: ${failed.join(', ')}`);
  }, 60000);
  it('protege el esquema, la habilitación y el alcance contextual', async () => {
    for (const pb of [teacher, student, admin]) await expect(pb.collection('course_surveys').getList(1, 1)).rejects.toMatchObject({ status: 403 });
    await expect(teacher.collection('courses').update(course, { surveysEnabled: false })).rejects.toMatchObject({ status: 404 });
    await expect(requireSurveyAccess(outsider, course, 'manager')).rejects.toThrow('permisos');
    await expect(requireSurveyAccess(outsider, course, 'student')).rejects.toThrow('matrícula');
    await expect(requireSurveyAccess(teacher, course, 'manager')).resolves.toBeTruthy();
  }, 30000);
  it('crea, edita y publica borradores sin exponerlos al alumno', async () => {
    survey = await saveCourseSurvey(teacher, service, course, null, '', design);
    let data = await readCourseSurvey(teacher, service, course, survey, 'manager');
    revision = data.survey.revision;
    expect((await listCourseSurveys(student, service, course, 'student')).surveys).toHaveLength(0);
    await expect(readCourseSurvey(student, service, course, survey, 'student')).rejects.toThrow('disponible');
    await saveCourseSurvey(teacher, service, course, survey, revision, { ...design, title: 'Consulta editada' });
    data = await readCourseSurvey(teacher, service, course, survey, 'manager');
    revision = data.survey.revision;
    await commandCourseSurvey(teacher, service, course, survey, 'publish', revision);
    expect((await listCourseSurveys(student, service, course, 'student')).surveys).toHaveLength(1);
    await expect(saveCourseSurvey(teacher, service, course, survey, revision, design)).rejects.toThrow('publicado');
  }, 30000);
  it('acepta una respuesta ante reintentos concurrentes y mantiene contenido anónimo', async () => {
    await Promise.all([submitCourseSurvey(student, service, course, survey, { q: 'Zeta' }), submitCourseSurvey(student, service, course, survey, { q: 'Zeta' })]);
    await submitCourseSurvey(secondStudent, service, course, survey, { q: 'Alfa' });
    const filter = service.filter('survey = {:survey}', { survey });
    const responses = await service.collection('course_survey_responses').getFullList({ filter });
    const participants = await service.collection('course_survey_participations').getFullList({ filter });
    expect(responses).toHaveLength(2); expect(participants).toHaveLength(2);
    for (const response of responses) { expect(response.student).toBe(''); expect(response).not.toHaveProperty('created'); expect(response).not.toHaveProperty('updated'); }
    const results = await readSurveyResults(teacher, service, course, survey);
    expect(results.individuals).toEqual([]);
    expect(results.questions[0].texts).toEqual(['Alfa', 'Zeta']);
    expect(JSON.stringify(results)).not.toMatch(/Prueba encuestas|student|created|updated|revision/);
    await expect(readSurveyResults(student, service, course, survey)).rejects.toThrow('permisos');
  }, 30000);
  it('conserva datos al deshabilitar y permite cerrar y duplicar', async () => {
    await admin.collection('courses').update(course, { surveysEnabled: false });
    await expect(listCourseSurveys(teacher, service, course, 'manager')).rejects.toThrow('habilitadas');
    expect((await service.collection('course_surveys').getOne(survey)).status).toBe('published');
    await admin.collection('courses').update(course, { surveysEnabled: true });
    await commandCourseSurvey(teacher, service, course, survey, 'close', '');
    const copy = await commandCourseSurvey(teacher, service, course, survey, 'duplicate', '');
    const record = await service.collection('course_surveys').getOne(copy);
    expect(record.status).toBe('draft');
    await commandCourseSurvey(teacher, service, course, copy, 'delete', record.revision);
    expect((await readSurveyResults(teacher, service, course, survey)).total).toBe(2);
  }, 30000);
  it('muestra identidad solo en encuestas identificadas y bloquea nuevos envíos tras cierre', async () => {
    const id = await saveCourseSurvey(admin, service, course, null, '', { ...design, anonymous: false });
    const record = await service.collection('course_surveys').getOne(id);
    await commandCourseSurvey(teacher, service, course, id, 'publish', record.revision);
    await submitCourseSurvey(student, service, course, id, { q: 'Identificada' });
    const results = await readSurveyResults(admin, service, course, id);
    expect(results.individuals).toEqual([{ name: 'Prueba encuestas alumno', answers: { q: 'Identificada' } }]);
    await commandCourseSurvey(teacher, service, course, id, 'close', '');
    await expect(submitCourseSurvey(secondStudent, service, course, id, { q: 'Fuera de plazo' })).rejects.toThrow('cerrada');
  }, 30000);
  it('el cierre invalida referencias en vuelo y revierte la participación sin borrar respuestas previas', async () => {
    const id = await saveCourseSurvey(teacher, service, course, null, '', design);
    const draft = await service.collection('course_surveys').getOne(id);
    await commandCourseSurvey(teacher, service, course, id, 'publish', draft.revision);
    const published = await service.collection('course_surveys').getOne(id);
    await submitCourseSurvey(student, service, course, id, { q: 'A tiempo' });
    const delayed = service.createBatch();
    delayed.collection('course_survey_participations').create({ survey: id, student: secondStudent.authStore.record!.id });
    delayed.collection('course_survey_responses').create({ survey: id, opening: published.opening, answers: { q: 'En vuelo' } });
    await commandCourseSurvey(teacher, service, course, id, 'close', '');
    await expect(delayed.send()).rejects.toMatchObject({ status: 400 });
    const filter = service.filter('survey = {:survey}', { survey: id });
    expect((await service.collection('course_survey_participations').getList(1, 1, { filter })).totalItems).toBe(1);
    expect((await readSurveyResults(teacher, service, course, id)).total).toBe(1);
  }, 30000);
});
