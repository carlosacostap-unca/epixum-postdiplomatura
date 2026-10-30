import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin } from './live-test-fixtures.mjs';

const directory = 'tmp/surveys';
const manifest = `${directory}/fixture.json`;
const pb = await testAdmin();
await pb.health.check();
async function cleanup(fixture) {
  for (const record of [...fixture.created].reverse()) {
    try { await pb.collection(record.collection).delete(record.id); }
    catch (error) { if (error.status !== 404) throw error; }
  }
  for (const role of ['teacher', 'student', 'admin']) await unlink(`${directory}/${role}-state.json`).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
if (process.argv[2] === 'cleanup') {
  await cleanup(JSON.parse(await readFile(manifest, 'utf8')));
  await unlink(manifest);
  console.log('Curso, cuentas y credenciales temporales de encuestas eliminados.');
} else {
  try { await readFile(manifest); throw new Error('Ya existe una prueba pendiente. Limpiarla antes de crear otra.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = { created: [], course: '', draft: '', survey: '' };
  const run = randomUUID().slice(0, 8);
  const create = async (collection, data) => {
    const record = await pb.collection(collection).create(data);
    fixture.created.push({ collection, id: record.id });
    return record;
  };
  await mkdir(directory, { recursive: true });
  try {
    const actors = {};
    for (const role of ['teacher', 'student', 'admin']) {
      const password = `Survey-${randomUUID()}!`;
      const user = await create('users', { email: `survey-ui-${run}-${role}@example.invalid`, name: `Prueba de encuestas ${role}`, role: role === 'admin' ? 'admin' : 'estudiante', verified: true, password, passwordConfirm: password });
      const client = new PocketBase(pb.baseURL);
      await client.collection('users').authWithPassword(user.email, password);
      actors[role] = user.id;
      await writeFile(`${directory}/${role}-state.json`, JSON.stringify({ cookies: [{ name: 'pb_auth', value: client.authStore.token, domain: '127.0.0.1', path: '/', httpOnly: true, secure: false, sameSite: 'Lax', expires: -1 }], origins: [] }));
    }
    const course = await create('courses', { title: `Encuestas · prueba visual ${run}`, description: 'Curso temporal de verificación', status: 'en curso', surveysEnabled: true, teachers: [actors.teacher] });
    fixture.course = course.id;
    await create('course_enrollments', { course: course.id, student: actors.student });
    const design = { course: course.id, description: 'Queremos conocer tu experiencia para mejorar las próximas clases.', anonymous: true, closesAt: '', questions: [
      { id: 'experience', title: '¿Tenías experiencia antes de empezar?', type: 'single', required: true, options: [{ id: 'yes', label: 'Sí, ya había practicado' }, { id: 'no', label: 'No, fue mi primer acercamiento' }] },
      { id: 'tools', title: '¿Qué actividades te resultan más útiles?', type: 'multiple', required: true, options: [{ id: 'practice', label: 'Prácticas guiadas' }, { id: 'examples', label: 'Ejemplos de casos reales' }, { id: 'discussion', label: 'Debates en clase' }] },
      { id: 'rating', title: '¿Cómo valorás el curso? (1: poco útil, 5: muy útil)', type: 'scale', required: true, options: [] },
      { id: 'comment', title: '¿Qué te gustaría mejorar?', type: 'text', required: false, options: [] },
    ] };
    const opening = randomUUID().replaceAll('-', '').slice(0, 15);
    fixture.survey = (await create('course_surveys', { ...design, title: 'Tu experiencia en el curso', status: 'published', revision: randomUUID(), opening })).id;
    await create('course_survey_openings', { id: opening, survey: fixture.survey });
    fixture.draft = (await create('course_surveys', { ...design, title: 'Diagnóstico inicial', status: 'draft', revision: randomUUID() })).id;
    await writeFile(manifest, JSON.stringify(fixture, null, 2));
    console.log(JSON.stringify({ course: fixture.course, draft: fixture.draft, survey: fixture.survey, states: `${directory}/*-state.json` }));
  } catch (error) { await cleanup(fixture); throw error; }
}
