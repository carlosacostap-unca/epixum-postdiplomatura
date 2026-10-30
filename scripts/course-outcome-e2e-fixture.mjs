import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin } from './live-test-fixtures.mjs';

const directory = 'tmp/outcomes'; const manifest = `${directory}/fixture.json`;
const pb = await testAdmin(); await pb.health.check();
async function cleanup(fixture) {
  for (const record of [...fixture.created].reverse()) {
    try { await pb.collection(record.collection).delete(record.id); } catch (error) { if (error.status !== 404) throw error; }
  }
  for (const role of ['teacher', 'student', 'second', 'admin']) await unlink(`${directory}/${role}-state.json`).catch(error => { if (error.code !== 'ENOENT') throw error; });
}
if (process.argv[2] === 'cleanup') {
  await cleanup(JSON.parse(await readFile(manifest, 'utf8'))); await unlink(manifest);
  console.log('Curso, cuentas y credenciales temporales de resultados eliminados.');
} else {
  try { await readFile(manifest); throw new Error('Existe una prueba pendiente. Limpiarla antes de crear otra.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = { created: [], course: '', student: '', second: '' };
  const run = randomUUID().slice(0, 8);
  const create = async (collection, data) => { const record = await pb.collection(collection).create(data); fixture.created.push({ collection, id: record.id }); return record; };
  await mkdir(directory, { recursive: true });
  try {
    const actors = {};
    for (const role of ['teacher', 'student', 'second', 'admin']) {
      const password = `Outcome-${randomUUID()}!`;
      const user = await create('users', { email: `outcome-ui-${run}-${role}@example.invalid`, name: role === 'student' ? 'Alumno de demostración A' : role === 'second' ? 'Alumno de demostración B' : role === 'teacher' ? 'Docente de demostración' : 'Administrador de demostración', role: role === 'admin' ? 'admin' : 'estudiante', verified: true, password, passwordConfirm: password });
      const client = new PocketBase(pb.baseURL); await client.collection('users').authWithPassword(user.email, password); actors[role] = user.id;
      await writeFile(`${directory}/${role}-state.json`, JSON.stringify({ cookies: [{ name: 'pb_auth', value: client.authStore.token, domain: '127.0.0.1', path: '/', httpOnly: true, secure: false, sameSite: 'Lax', expires: -1 }], origins: [] }));
    }
    const course = await create('courses', { title: `Resultados · prueba visual ${run}`, description: 'Curso temporal para comprobar resultados de cursada.', status: 'en curso', outcomesEnabled: false, teachers: [actors.teacher] });
    fixture.course = course.id; fixture.student = actors.student; fixture.second = actors.second;
    for (const student of [actors.student, actors.second]) await create('course_enrollments', { course: course.id, student });
    await writeFile(manifest, JSON.stringify(fixture, null, 2));
    console.log(JSON.stringify({ course: fixture.course, student: fixture.student, second: fixture.second, states: `${directory}/*-state.json` }));
  } catch (error) { await cleanup(fixture); throw error; }
}
