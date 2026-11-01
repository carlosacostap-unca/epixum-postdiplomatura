import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin } from './live-test-fixtures.mjs';
import { criticalThinkingSurveys } from './critical-thinking-surveys.mjs';

const directory = 'tmp/survey-targeting'; const manifest = `${directory}/fixture.json`;
const pb = await testAdmin(); await pb.health.check();
const roles = ['teacher', 'approved', 'others', 'pending', 'admin'];
async function cleanup(fixture) {
  const failures = [];
  for (const item of [...fixture.created].reverse()) {
    try { await pb.collection(item.collection).delete(item.id); }
    catch (error) { if (error.status !== 404) failures.push(`${item.collection}/${item.id}`); }
  }
  if (failures.length) throw new Error(`No se pudieron eliminar: ${failures.join(', ')}`);
  for (const role of roles) await unlink(`${directory}/${role}-state.json`).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
if (process.argv[2] === 'cleanup') {
  await cleanup(JSON.parse(await readFile(manifest, 'utf8'))); await unlink(manifest);
  console.log('Curso, cuentas y credenciales de segmentación eliminados.');
} else {
  try { await readFile(manifest); throw new Error('Ya hay una prueba pendiente; limpiar antes de continuar.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = { created: [], course: '', approved: '', others: '', draft: '' }; const run = randomUUID().slice(0, 8);
  const create = async (collection, data) => {
    const record = await pb.collection(collection).create(data); fixture.created.push({ collection, id: record.id }); return record;
  };
  await mkdir(directory, { recursive: true });
  try {
    const actors = {};
    for (const role of roles) {
      const password = `Targeting-${randomUUID()}!`;
      const user = await create('users', { email: `targeting-ui-${run}-${role}@example.invalid`, name: `Prueba segmentación ${role}`, role: role === 'admin' ? 'admin' : 'estudiante', verified: true, password, passwordConfirm: password });
      actors[role] = user.id; const client = new PocketBase(pb.baseURL); await client.collection('users').authWithPassword(user.email, password);
      await writeFile(`${directory}/${role}-state.json`, JSON.stringify({ cookies: [{ name: 'pb_auth', value: client.authStore.token, domain: '127.0.0.1', path: '/', httpOnly: true, secure: false, sameSite: 'Lax', expires: -1 }], origins: [] }));
    }
    fixture.course = (await create('courses', { title: `Encuestas por resultado · prueba ${run}`, description: 'Curso temporal para comprobar destinatarios', status: 'en curso', surveysEnabled: true, outcomesEnabled: true, teachers: [actors.teacher] })).id;
    for (const role of ['approved', 'others', 'pending']) {
      await create('course_enrollments', { course: fixture.course, student: actors[role] });
      const published = role === 'pending' ? null : { status: role === 'approved' ? 'aprobado' : 'no_completo', grade: null, feedback: '', publishedAt: new Date().toISOString() };
      await create('course_outcomes', { course: fixture.course, student: actors[role], draft: { status: 'aprobado', grade: null, feedback: '' }, published, revision: randomUUID() });
    }
    for (const [i, template] of criticalThinkingSurveys().entries()) {
      const opening = randomUUID().replaceAll('-', '').slice(0, 15);
      const survey = await create('course_surveys', { ...template.design, course: fixture.course, status: 'published', opening, revision: randomUUID() });
      await create('course_survey_openings', { id: opening, survey: survey.id });
      fixture[i === 0 ? 'approved' : 'others'] = survey.id;
      if (i === 0) fixture.draft = (await create('course_surveys', { ...template.design, course: fixture.course, status: 'draft', revision: randomUUID() })).id;
    }
    await writeFile(manifest, JSON.stringify(fixture, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ course: fixture.course, approved: fixture.approved, others: fixture.others, draft: fixture.draft }));
  } catch (error) { await cleanup(fixture); throw error; }
}
