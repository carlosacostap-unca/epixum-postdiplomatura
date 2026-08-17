import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config({ path: '.env.local', quiet: true });

const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const superEmail = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const superPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !superEmail || !superPassword) throw new Error('Faltan las credenciales de PocketBase en .env.local');

const suffix = randomUUID().slice(0, 8);
const password = `Epixum-${randomUUID()}!`;
const created = [];
const superPb = new PocketBase(url);
superPb.autoCancellation(false);

function client() { const pb = new PocketBase(url); pb.autoCancellation(false); return pb; }
async function fixture(collection, data) { const record = await superPb.collection(collection).create(data); created.push({ collection, id: record.id }); return record; }
async function expectDenied(operation, label) {
  try { await operation(); assert.fail(`${label}: la operación debió ser rechazada`); }
  catch (error) {
    if (error?.code === 'ERR_ASSERTION') throw error;
    assert.ok([400, 403, 404].includes(error?.status), `${label}: estado inesperado ${error?.status}`);
  }
}
async function createUser(role) {
  const email = `openspec-content-${role}-${suffix}-${randomUUID().slice(0, 6)}@example.invalid`;
  const user = await fixture('users', { email, emailVisibility: false, verified: true, password, passwordConfirm: password, role, name: `Prueba ${role}`, firstName: 'Prueba', lastName: role });
  const pb = client();
  await pb.collection('users').authWithPassword(email, password);
  return { pb, user };
}
async function cleanup() {
  for (const item of [...created].reverse()) {
    try { await superPb.collection(item.collection).delete(item.id); }
    catch (error) { if (error?.status !== 404) console.warn(`No se pudo limpiar ${item.collection}/${item.id}: ${error?.status || error}`); }
  }
}

try {
  await superPb.collection('_superusers').authWithPassword(superEmail, superPassword);
  const admin = await createUser('admin');
  const teacher = await createUser('docente');
  const outsiderTeacher = await createUser('docente');
  const student = await createUser('estudiante');
  const outsiderStudent = await createUser('estudiante');
  const course = await fixture('courses', { title: `Contenidos ${suffix}`, description: '', status: 'en curso', organizationMode: 'semanal', contentsEnabled: false, teachers: [teacher.user.id] });
  await fixture('course_enrollments', { course: course.id, student: student.user.id });

  await expectDenied(() => teacher.pb.collection('courses').update(course.id, { contentsEnabled: true }), 'el docente no habilita contenidos');
  await admin.pb.collection('courses').update(course.id, { contentsEnabled: true });
  await expectDenied(() => admin.pb.collection('course_contents').create({ course: course.id, title: 'Admin', position: 0 }), 'el admin no crea contenidos');
  await expectDenied(() => outsiderTeacher.pb.collection('course_contents').create({ course: course.id, title: 'Ajeno', position: 0 }), 'el docente ajeno no crea contenidos');

  const first = await teacher.pb.collection('course_contents').create({ course: course.id, title: 'Primero', description: '<p>Visible</p>', position: 0 });
  created.push({ collection: 'course_contents', id: first.id });
  const second = await teacher.pb.collection('course_contents').create({ course: course.id, title: 'Segundo', description: '', position: 1 });
  created.push({ collection: 'course_contents', id: second.id });
  const resource = await teacher.pb.collection('links').create({ content: first.id, title: 'Guía', url: 'https://example.com/guia', type: 'link' });
  created.push({ collection: 'links', id: resource.id });

  await expectDenied(() => teacher.pb.collection('links').create({ content: first.id, class: 'invalid', title: 'Dos padres', url: 'https://example.com' }), 'el recurso no admite dos padres');
  await expectDenied(() => admin.pb.collection('course_contents').getOne(first.id), 'el admin de aplicación no consulta contenidos');
  await expectDenied(() => outsiderStudent.pb.collection('course_contents').getOne(first.id), 'el estudiante ajeno no consulta contenidos');
  const visible = await student.pb.collection('course_contents').getFullList({ filter: student.pb.filter('course = {:course}', { course: course.id }), sort: 'position' });
  assert.deepEqual(visible.map((item) => item.title), ['Primero', 'Segundo']);
  assert.equal((await student.pb.collection('links').getOne(resource.id)).title, 'Guía');

  await admin.pb.collection('courses').update(course.id, { contentsEnabled: false });
  await expectDenied(() => student.pb.collection('course_contents').getOne(first.id), 'deshabilitar oculta al estudiante');
  await expectDenied(() => teacher.pb.collection('course_contents').update(first.id, { title: 'Oculto' }), 'deshabilitar bloquea gestión docente');
  assert.equal((await superPb.collection('course_contents').getOne(first.id)).title, 'Primero');
  assert.equal((await superPb.collection('links').getOne(resource.id)).title, 'Guía');

  await admin.pb.collection('courses').update(course.id, { contentsEnabled: true });
  assert.equal((await student.pb.collection('course_contents').getOne(first.id)).title, 'Primero');
  assert.equal((await student.pb.collection('links').getOne(resource.id)).title, 'Guía');
  process.stdout.write('Verificación de contenidos superada: configuración admin, gestión docente, matrícula, recursos y conservación respetan el alcance.\n');
} catch (error) {
  const location = error?.stack?.split('\n').find((line) => line.includes('verify-course-content-access.mjs'))?.trim();
  process.stderr.write(`Verificación de contenidos fallida (${error?.status || 'sin estado'}): ${error?.response?.message || error?.message || error}${location ? ` · ${location}` : ''}\n`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
