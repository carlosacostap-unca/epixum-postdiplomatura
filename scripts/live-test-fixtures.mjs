import { randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

export async function testAdmin() {
  dotenv.config({ path: '.env.local', quiet: true });
  const admin = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL); admin.autoCancellation(false);
  await admin.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD);
  return admin;
}
export async function pool(items, concurrency, operation) {
  let index = 0;
  const output = new Array(items.length);
  const errors = [];
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const i = index++;
      try { output[i] = await operation(items[i], i); } catch (error) { errors.push(error); }
    }
  }));
  if (errors.length) throw errors[0];
  return output;
}
export async function cleanupLiveFixture(admin, fixture) {
  const failures = [];
  // Course cascades classes/materials/sessions/participations/responses first.
  for (const record of [...fixture.created].reverse()) {
    try { await admin.collection(record.collection).delete(record.id); }
    catch (error) { if (error.status !== 404) failures.push(`${record.collection}/${record.id}`); }
  }
  if (failures.length) throw new Error(`No se pudieron limpiar fixtures: ${failures.join(', ')}`);
}
export async function createLiveFixture(admin, count) {
  const fixture = { created: [], students: [], teacher: null, course: '', lesson: '' };
  const run = randomUUID().slice(0, 8);
  const create = async (collection, data) => {
    const record = await admin.collection(collection).create(data);
    fixture.created.push({ collection, id: record.id }); return record;
  };
  const user = async (label) => {
    const password = `Live-${randomUUID()}!`;
    const record = await create('users', { email: `live-${run}-${label}@example.invalid`, name: label === 'docente' ? 'Docente de demostración' : `Alumno ${label}`, role: 'estudiante', verified: true, password, passwordConfirm: password });
    const pb = new PocketBase(admin.baseURL); pb.autoCancellation(false);
    await pb.collection('users').authWithPassword(record.email, password);
    return { id: record.id, token: pb.authStore.token };
  };
  try {
    fixture.teacher = await user('docente');
    fixture.students = await pool(Array.from({ length: count }, (_, i) => String(i + 1).padStart(3, '0')), 8, user);
    const course = await create('courses', { title: `Prueba en vivo ${run}`, teachers: [fixture.teacher.id], status: 'borrador', interactiveClassesEnabled: true });
    fixture.course = course.id;
    await pool(fixture.students, 8, (student) => create('course_enrollments', { course: course.id, student: student.id }));
    const cls = await create('classes', { course: course.id, title: 'Encuentro de demostración' });
    const material = JSON.parse(await readFile('public/interactive-class-example.json', 'utf8'));
    const lesson = await create('interactive_lessons', { course: course.id, class: cls.id, title: 'Aprender participando', status: 'ready', material });
    fixture.lesson = lesson.id;
    return fixture;
  } catch (error) { await cleanupLiveFixture(admin, fixture); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = 'tmp/live-browser-fixture.json';
  const admin = await testAdmin();
  if (process.argv[2] === 'create') {
    const fixture = await createLiveFixture(admin, 2);
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx' });
    console.log('Fixture de navegador creado; credenciales temporales guardadas sin mostrarlas.');
  } else if (process.argv[2] === 'cleanup') {
    await cleanupLiveFixture(admin, JSON.parse(await readFile(path, 'utf8')));
    await unlink(path);
    console.log('Fixture de navegador eliminado.');
  } else throw new Error('Usá create o cleanup.');
}
