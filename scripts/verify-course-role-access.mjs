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

async function fixture(collection, data) {
  const record = await superPb.collection(collection).create(data);
  created.push({ collection, id: record.id });
  return record;
}

async function createUser(label, role) {
  const email = `course-role-${label}-${suffix}@example.invalid`;
  const user = await fixture('users', { email, verified: true, password, passwordConfirm: password, role, name: `Fixture ${label}` });
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection('users').authWithPassword(email, password);
  return { pb, user };
}

async function denied(operation, label) {
  try { await operation(); assert.fail(`${label}: debía rechazarse`); }
  catch (error) {
    if (error?.code === 'ERR_ASSERTION') throw error;
    assert.ok([400, 401, 403, 404].includes(error?.status), `${label}: estado ${error?.status}`);
  }
}

async function cleanup() {
  for (const item of [...created].reverse()) {
    try { await superPb.collection(item.collection).delete(item.id); }
    catch (error) { if (error?.status !== 404) process.stderr.write(`No se pudo limpiar ${item.collection}/${item.id}\n`); }
  }
}

try {
  await superPb.collection('_superusers').authWithPassword(superEmail, superPassword);
  const admin = await createUser('admin', 'admin');
  const mixed = await createUser('mixed', 'estudiante');
  const legacyStudent = await createUser('legacy-student', 'docente');
  const outsiderTeacher = await createUser('outsider-teacher', 'docente');
  const outsiderStudent = await createUser('outsider-student', 'estudiante');

  const courseA = await fixture('courses', { title: `Rol A ${suffix}`, status: 'en curso', organizationMode: 'tradicional', teachers: [mixed.user.id] });
  const courseB = await fixture('courses', { title: `Rol B ${suffix}`, status: 'en curso', organizationMode: 'tradicional', teachers: [] });
  await fixture('course_enrollments', { course: courseA.id, student: legacyStudent.user.id });
  await fixture('course_enrollments', { course: courseB.id, student: mixed.user.id });
  const classA = await fixture('classes', { course: courseA.id, title: 'Clase A', description: '' });
  const classB = await fixture('classes', { course: courseB.id, title: 'Clase B', description: '' });

  const createdByMixed = await mixed.pb.collection('classes').create({ course: courseA.id, title: 'Clase docente mixta', description: '' });
  created.push({ collection: 'classes', id: createdByMixed.id });
  await mixed.pb.collection('classes').getOne(classB.id);
  await legacyStudent.pb.collection('classes').getOne(classA.id);
  await admin.pb.collection('classes').getOne(classA.id);

  await denied(() => mixed.pb.collection('classes').create({ course: courseB.id, title: 'No docente', description: '' }), 'matrícula no concede docencia');
  await denied(() => outsiderTeacher.pb.collection('classes').getOne(classA.id), 'rol docente global no concede acceso');
  await denied(() => outsiderStudent.pb.collection('classes').getOne(classA.id), 'estudiante ajeno no accede');
  await denied(() => mixed.pb.collection('course_enrollments').create({ course: courseA.id, student: mixed.user.id }), 'matrícula directa bloqueada');

  const anonymous = new PocketBase(url);
  const anonymousCourses = await anonymous.collection('courses').getList(1, 1);
  assert.equal(anonymousCourses.totalItems, 0, 'cliente anónimo no debe ver cursos');

  process.stdout.write('Verificación de roles por curso superada: admin, asignación, matrícula, cuenta mixta, actores ajenos y anónimo respetan su alcance.\n');
} catch (error) {
  process.stderr.write(`Verificación de roles por curso fallida (${error?.status || 'sin estado'}): ${error?.response?.message || error?.message || error}\n`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
