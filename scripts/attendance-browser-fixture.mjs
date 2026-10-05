import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import PocketBase from 'pocketbase';
import { testAdmin, createLiveFixture, cleanupLiveFixture } from './live-test-fixtures.mjs';
const directory = 'backups/pocketbase/attendance-qa';
const path = `${directory}/fixture.json`;
const admin = await testAdmin();
if (process.argv[2] === 'create') {
  await mkdir(directory, { recursive: true });
  try { await readFile(path); throw new Error('Ya existe un fixture pendiente de limpieza.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = await createLiveFixture(admin, 2);
  try {
    const password = `Attendance-${randomUUID()}!`;
    const user = await admin.collection('users').create({ email: `${randomUUID()}@example.invalid`, name: 'Admin temporal asistencia', role: 'admin', verified: true, password, passwordConfirm: password });
    fixture.created.push({ collection: 'users', id: user.id });
    const client = new PocketBase(admin.baseURL); await client.collection('users').authWithPassword(user.email, password);
    for (const [role, token] of Object.entries({ teacher: fixture.teacher.token, student: fixture.students[0].token, admin: client.authStore.token })) {
      await writeFile(`${directory}/${role}-state.json`, JSON.stringify({ cookies: [{ name: 'pb_auth', value: token, domain: 'localhost', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }));
    }
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx' });
    console.log(JSON.stringify({ course: fixture.course, lesson: fixture.lesson }));
  } catch (error) { await cleanupLiveFixture(admin, fixture); throw error; }
} else {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  if (process.argv[2] === 'inspect') {
    const sessions = await admin.collection('interactive_sessions').getFullList({ filter: admin.filter('course = {:course}', { course: fixture.course }), fields: 'id,code,status,attendanceEnabled' });
    console.log(JSON.stringify({ course: fixture.course, lesson: fixture.lesson, sessions }));
  } else if (process.argv[2] === 'cleanup') {
    await cleanupLiveFixture(admin, fixture);
    for (const role of ['teacher', 'student', 'admin']) await unlink(`${directory}/${role}-state.json`);
    await unlink(path);
    console.log('Curso, alumnos, asistencias y credenciales temporales eliminados.');
  } else throw new Error('Usá create, inspect o cleanup.');
}
