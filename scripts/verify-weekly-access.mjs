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

function client() {
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  return pb;
}

async function fixture(collection, data) {
  const record = await superPb.collection(collection).create(data);
  created.push({ collection, id: record.id });
  return record;
}

async function expectDenied(operation, label) {
  try {
    await operation();
    assert.fail(`${label}: la operación debió ser rechazada`);
  } catch (error) {
    if (error?.code === 'ERR_ASSERTION') throw error;
    assert.ok([400, 403, 404].includes(error?.status), `${label}: estado inesperado ${error?.status}`);
  }
}

async function createUser(role) {
  const email = `openspec-${role}-${suffix}-${randomUUID().slice(0, 6)}@example.invalid`;
  const user = await fixture('users', {
    email,
    emailVisibility: false,
    verified: true,
    password,
    passwordConfirm: password,
    role,
    name: `Prueba ${role}`,
    firstName: 'Prueba',
    lastName: role,
  });
  const pb = client();
  await pb.collection('users').authWithPassword(email, password);
  return { pb, user };
}

async function cleanup() {
  for (const item of [...created].reverse()) {
    try {
      await superPb.collection(item.collection).delete(item.id);
    } catch (error) {
      if (error?.status !== 404) console.warn(`No se pudo limpiar ${item.collection}/${item.id}: ${error?.status || error}`);
    }
  }
}

try {
  await superPb.collection('_superusers').authWithPassword(superEmail, superPassword);
  const admin = await createUser('admin');
  const teacher = await createUser('docente');
  const outsider = await createUser('docente');
  const student = await createUser('estudiante');

  const courseA = await fixture('courses', {
    title: `Curso semanal de prueba ${suffix}`,
    description: 'Fixture temporal para verificar reglas semanales.',
    status: 'en curso',
    organizationMode: 'tradicional',
    teachers: [teacher.user.id],
  });
  const courseB = await fixture('courses', {
    title: `Curso semanal cruzado ${suffix}`,
    description: 'Fixture temporal para verificar relaciones entre cursos.',
    status: 'en curso',
    organizationMode: 'semanal',
    teachers: [teacher.user.id],
  });
  await fixture('course_enrollments', { course: courseA.id, student: student.user.id });

  await admin.pb.collection('courses').update(courseA.id, { organizationMode: 'semanal' });
  await expectDenied(
    () => teacher.pb.collection('courses').update(courseA.id, { organizationMode: 'tradicional' }),
    'el docente no cambia la modalidad',
  );
  await expectDenied(
    () => admin.pb.collection('course_weeks').create({ course: courseA.id, number: 99, title: 'No permitida', status: 'borrador' }),
    'el administrador no crea semanas',
  );
  await expectDenied(
    () => outsider.pb.collection('course_weeks').create({ course: courseA.id, number: 98, title: 'Ajena', status: 'borrador' }),
    'un docente ajeno no crea semanas',
  );

  assert.equal(teacher.pb.authStore.record?.role, 'docente');
  const teacherCourse = await teacher.pb.collection('courses').getOne(courseA.id, { fields: 'id,teachers,organizationMode' });
  assert.equal(teacherCourse.organizationMode, 'semanal');
  assert.ok(teacherCourse.teachers.includes(teacher.user.id));
  const permissionProbe = await teacher.pb.collection('classes').create({ course: courseA.id, title: 'Prueba de permiso docente', description: '' });
  created.push({ collection: 'classes', id: permissionProbe.id });

  const now = Date.now();
  const published = await teacher.pb.collection('course_weeks').create({ course: courseA.id, number: 0, title: 'Publicada', status: 'publicada' });
  created.push({ collection: 'course_weeks', id: published.id });
  const draft = await teacher.pb.collection('course_weeks').create({ course: courseA.id, number: 2, title: 'Borrador', status: 'borrador' });
  created.push({ collection: 'course_weeks', id: draft.id });
  const past = await teacher.pb.collection('course_weeks').create({ course: courseA.id, number: 3, title: 'Programada vigente', status: 'programada', publishAt: new Date(now - 60_000).toISOString() });
  created.push({ collection: 'course_weeks', id: past.id });
  const future = await teacher.pb.collection('course_weeks').create({ course: courseA.id, number: 4, title: 'Programada futura', status: 'programada', publishAt: new Date(now + 86_400_000).toISOString() });
  created.push({ collection: 'course_weeks', id: future.id });
  const otherWeek = await teacher.pb.collection('course_weeks').create({ course: courseB.id, number: 1, title: 'Otro curso', status: 'publicada' });
  created.push({ collection: 'course_weeks', id: otherWeek.id });

  for (const [title, week] of [['Clase publicada', published.id], ['Clase borrador', draft.id], ['Clase programada vigente', past.id], ['Clase futura', future.id], ['Clase sin semana', null]]) {
    const record = await teacher.pb.collection('classes').create({ course: courseA.id, title, description: '', week });
    created.push({ collection: 'classes', id: record.id });
  }
  await expectDenied(
    () => teacher.pb.collection('classes').create({ course: courseA.id, title: 'Relación manipulada', week: otherWeek.id }),
    'PocketBase rechaza una semana de otro curso',
  );

  const studentWeeks = await student.pb.collection('course_weeks').getFullList({ filter: student.pb.filter('course = {:course}', { course: courseA.id }) });
  assert.deepEqual(studentWeeks.map((week) => week.number).sort(), [0, 3]);
  const studentClasses = await student.pb.collection('classes').getFullList({ filter: student.pb.filter('course = {:course}', { course: courseA.id }) });
  assert.deepEqual(studentClasses.map((item) => item.title).sort(), ['Clase programada vigente', 'Clase publicada']);
  await expectDenied(() => student.pb.collection('course_weeks').getOne(draft.id), 'el estudiante no abre una semana borrador');
  await expectDenied(() => student.pb.collection('course_weeks').getOne(future.id), 'el estudiante no abre una semana futura');

  const inquiry = await student.pb.collection('inquiries').create({
    course: courseA.id,
    week: published.id,
    author: student.user.id,
    title: 'Consulta visible',
    description: 'Consulta de prueba',
    status: 'Pendiente',
  });
  created.push({ collection: 'inquiries', id: inquiry.id });
  await expectDenied(
    () => student.pb.collection('inquiries').create({ course: courseA.id, week: draft.id, author: student.user.id, title: 'Consulta oculta', description: 'No permitida', status: 'Pendiente' }),
    'el estudiante no consulta en una semana oculta',
  );
  await expectDenied(
    () => student.pb.collection('inquiries').create({ course: courseA.id, author: student.user.id, title: 'Consulta general', description: 'No permitida', status: 'Pendiente' }),
    'el curso semanal no admite consultas generales',
  );

  process.stdout.write('Verificación de acceso semanal superada: admin, docentes y estudiante respetan modalidad, alcance y visibilidad.\n');
} catch (error) {
  const location = error?.stack?.split('\n').find((line) => line.includes('verify-weekly-access.mjs'))?.trim();
  process.stderr.write(`Verificación semanal fallida (${error?.status || 'sin estado'}): ${error?.response?.message || error?.message || error}${location ? ` · ${location}` : ''}\n`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
