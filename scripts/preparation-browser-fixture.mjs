import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';
const pb = await testAdmin(); const root = 'tmp/preparation';
await mkdir(root, { recursive: true });
if (process.argv[2] === 'cleanup') {
  const fixture = JSON.parse(await readFile(`${root}/fixture.json`, 'utf8'));
  await cleanupLiveFixture(pb, fixture);
  for (const file of ['fixture.json', 'teacher.json', 'student.json']) await unlink(`${root}/${file}`);
  console.log('Pruebas de preparación: curso, usuarios y credenciales temporales eliminados.');
} else if (process.argv[2] === 'create') {
  const fixture = { created: [], course: '' };
  const create = async (collection, data) => { const row = await pb.collection(collection).create(data); fixture.created.push({ collection, id: row.id }); return row; };
  try {
    const people = {};
    for (const role of ['teacher', 'student']) {
      const password = `Practice-${randomUUID()}!`;
      const row = await create('users', { email: `practice-${randomUUID()}@example.invalid`, name: role === 'teacher' ? 'Docente de prueba' : 'Alumno de prueba', role: 'estudiante', password, passwordConfirm: password, verified: true });
      const { default: PocketBase } = await import('pocketbase'); const client = new PocketBase(pb.baseURL);
      await client.collection('users').authWithPassword(row.email, password); people[role] = row.id;
      await writeFile(`${root}/${role}.json`, JSON.stringify({ cookies: [{ name: 'pb_auth', value: client.authStore.token, domain: '127.0.0.1', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }));
    }
    const course = await create('courses', { title: 'Ensayo de preparación', teachers: [people.teacher], status: 'en curso', preparationEnabled: true }); fixture.course = course.id;
    await create('course_enrollments', { course: course.id, student: people.student });
    await writeFile(`${root}/fixture.json`, JSON.stringify(fixture), { flag: 'wx' });
    console.log(JSON.stringify({ courseId: course.id, teacherUrl: `http://127.0.0.1:3107/docentes/cursos/${course.id}/preparacion`, studentUrl: `http://127.0.0.1:3107/estudiantes/cursos/${course.id}/preparacion` }));
  } catch (error) { await cleanupLiveFixture(pb, fixture); throw error; }
} else throw new Error('Usá create o cleanup.');
