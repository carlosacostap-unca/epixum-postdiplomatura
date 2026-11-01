// @vitest-environment node
import { randomUUID } from 'node:crypto';
import PocketBase from 'pocketbase';
import dotenv from 'dotenv';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { commandCourseSurvey, listCourseSurveys, readCourseSurvey, readSurveyResults, saveCourseSurvey, submitCourseSurvey } from './course-survey-service';

describe.skipIf(process.env.RUN_SURVEY_TARGETING_INTEGRATION !== 'true')('segmentación: PocketBase real con datos temporales', () => {
  let service: PocketBase; let teacher: PocketBase; const students: PocketBase[] = [];
  let course = ''; let approved = ''; let others = ''; let general = '';
  const outcomes: string[] = []; const created: { collection: string; id: string }[] = [];
  const design = { title: 'Encuesta temporal', description: '', anonymous: true, closesAt: '', questions: [{ id: 'q', title: 'Opinión', type: 'text' as const, required: false, options: [] }] };
  const snapshot = (status: string) => ({ status, grade: 0, feedback: 'Contenido reservado', publishedAt: new Date().toISOString() });
  beforeAll(async () => {
    dotenv.config({ path: '.env.local', quiet: true });
    service = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL); service.autoCancellation(false); await service.health.check();
    await service.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL || '', process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD || '');
    const run = randomUUID().slice(0, 8);
    const user = async (label: string) => {
      const password = `Targeting-${randomUUID()}!`;
      const record = await service.collection('users').create({ email: `targeting-${run}-${label}@example.invalid`, name: `Temporal ${label}`, role: 'estudiante', verified: true, password, passwordConfirm: password });
      created.push({ collection: 'users', id: record.id });
      const pb = new PocketBase(service.baseURL); pb.autoCancellation(false); await pb.collection('users').authWithPassword(record.email, password); return pb;
    };
    teacher = await user('docente');
    for (const label of ['aprobado', 'no-aprobado', 'no-completo', 'pendiente']) students.push(await user(label));
    const record = await service.collection('courses').create({ title: `Prueba segmentación ${run}`, status: 'en curso', teachers: [teacher.authStore.record!.id], surveysEnabled: true, outcomesEnabled: true });
    course = record.id; created.push({ collection: 'courses', id: course });
    for (const [i, student] of students.entries()) {
      await service.collection('course_enrollments').create({ course, student: student.authStore.record!.id });
      const published = i < 3 ? snapshot(['aprobado', 'no_aprobado', 'no_completo'][i]) : null;
      const outcome = await service.collection('course_outcomes').create({ course, student: student.authStore.record!.id, draft: snapshot('aprobado'), published, revision: randomUUID() });
      outcomes.push(outcome.id);
    }
    for (const audience of ['approved', 'not_approved_or_incomplete', 'all']) {
      const id = await saveCourseSurvey(teacher, service, course, null, '', { ...design, audience });
      const draft = (await readCourseSurvey(teacher, service, course, id, 'manager')).survey;
      await commandCourseSurvey(teacher, service, course, id, 'publish', draft.revision);
      if (audience === 'approved') approved = id; else if (audience === 'all') general = id; else others = id;
    }
    // PocketBase represents records created before this field existed as an empty select.
    await service.collection('course_surveys').update(general, { audience: '' });
  }, 60000);
  afterAll(async () => {
    const failures: string[] = [];
    for (const item of [...created].reverse()) {
      try { await service.collection(item.collection).delete(item.id); }
      catch (error) { if (!(error && typeof error === 'object' && 'status' in error && error.status === 404)) failures.push(`${item.collection}/${item.id}`); }
    }
    if (failures.length) throw new Error(`Fallo al eliminar datos temporales: ${failures.join(', ')}`);
  }, 60000);
  it('asigna los tres estados y oculta resultados pendientes, sin filtrar notas ni devoluciones', async () => {
    for (const [i, student] of students.entries()) {
      const visible = (await listCourseSurveys(student, service, course, 'student')).surveys;
      expect(visible.map(survey => survey.id).sort()).toEqual((i === 0 ? [approved, general] : i < 3 ? [others, general] : [general]).sort());
      expect(JSON.stringify(visible)).not.toMatch(/Contenido reservado|grade|publishedAt|draft/);
      const denied = i === 0 ? others : approved;
      await expect(readCourseSurvey(student, service, course, denied, 'student')).rejects.toThrow('disponible');
      await expect(submitCourseSurvey(student, service, course, denied, { q: 'No debe guardarse' })).rejects.toThrow('disponible');
      await expect(student.collection('course_outcomes').getList(1, 1)).rejects.toMatchObject({ status: 403 });
    }
  }, 30000);
  it('acepta cada grupo con anonimato y conserva respuestas al publicar una corrección o retirar el resultado', async () => {
    await submitCourseSurvey(students[0], service, course, approved, { q: 'Opinión A' });
    for (const student of students.slice(1, 3)) await submitCourseSurvey(student, service, course, others, { q: 'Opinión B' });
    const filter = service.filter('survey = {:survey}', { survey: others });
    const answers = await service.collection('course_survey_responses').getFullList({ filter });
    expect(answers).toHaveLength(2); expect(answers.every(answer => !answer.student)).toBe(true);
    await service.collection('course_outcomes').update(outcomes[0], { draft: snapshot('no_completo') });
    await expect(readCourseSurvey(students[0], service, course, approved, 'student')).resolves.toBeTruthy();
    await service.collection('course_outcomes').update(outcomes[0], { published: snapshot('no_completo') });
    await expect(readCourseSurvey(students[0], service, course, approved, 'student')).rejects.toThrow('disponible');
    await expect(submitCourseSurvey(students[0], service, course, approved, { q: 'Reintento' })).rejects.toThrow('disponible');
    await expect(readCourseSurvey(students[0], service, course, others, 'student')).resolves.toBeTruthy();
    await service.collection('course_outcomes').update(outcomes[1], { published: null });
    await expect(readCourseSurvey(students[1], service, course, others, 'student')).rejects.toThrow('disponible');
    expect((await readSurveyResults(teacher, service, course, approved)).total).toBe(1);
    expect((await readSurveyResults(teacher, service, course, others)).total).toBe(2);
  }, 30000);
  it('deshabilitar resultados revoca las segmentadas, conserva generales y no permite publicar nuevos grupos', async () => {
    await service.collection('courses').update(course, { outcomesEnabled: false });
    expect((await listCourseSurveys(students[2], service, course, 'student')).surveys.map(s => s.id)).toEqual([general]);
    await expect(submitCourseSurvey(students[2], service, course, others, {})).rejects.toThrow('disponible');
    const copy = await commandCourseSurvey(teacher, service, course, others, 'duplicate', '');
    const draft = (await readCourseSurvey(teacher, service, course, copy, 'manager')).survey;
    expect(draft.audience).toBe('not_approved_or_incomplete');
    await expect(commandCourseSurvey(teacher, service, course, copy, 'publish', draft.revision)).rejects.toThrow('habilitar los resultados');
    await expect(submitCourseSurvey(students[3], service, course, general, {})).rejects.toThrow('al menos una');
    await submitCourseSurvey(students[3], service, course, general, { q: 'Encuesta general disponible' });
  }, 30000);
});
