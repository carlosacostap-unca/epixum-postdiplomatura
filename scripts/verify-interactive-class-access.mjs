import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !email || !password) throw new Error('Faltan credenciales de PocketBase.');
const admin = new PocketBase(url);
admin.autoCancellation(false);
const created = [];
const runId = randomUUID().slice(0, 8);
const userPassword = `Interactive-${randomUUID()}!`;
async function fixture(collection, data) {
  const record = await admin.collection(collection).create(data);
  created.push({ collection, id: record.id });
  return record;
}
async function user(role) {
  const record = await fixture('users', { email: `interactive-${runId}-${randomUUID().slice(0, 6)}@example.invalid`, password: userPassword, passwordConfirm: userPassword, role, name: 'Prueba interactivas', verified: true });
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection('users').authWithPassword(record.email, userPassword);
  return { record, pb };
}
async function denied(action, label) {
  try { await action(); assert.fail(`${label}: se esperaba rechazo`); }
  catch (error) { if (error?.code === 'ERR_ASSERTION') throw error; assert.ok([400, 403, 404].includes(error?.status), `${label}: estado ${error?.status}`); }
}

try {
  await admin.collection('_superusers').authWithPassword(email, password);
  const owner = await user('estudiante'); // Docencia contextual, independiente del rol global.
  const outsider = await user('docente');
  const student = await user('estudiante');
  const appAdmin = await user('admin');
  const course = await fixture('courses', { title: `Prueba interactivas ${runId}`, teachers: [owner.record.id], status: 'borrador', interactiveClassesEnabled: false });
  const otherCourse = await fixture('courses', { title: `Otro curso interactivas ${runId}`, teachers: [outsider.record.id], status: 'borrador', interactiveClassesEnabled: true });
  const sameOwnerCourse = await fixture('courses', { title: `Otro curso propio ${runId}`, teachers: [owner.record.id], status: 'borrador', interactiveClassesEnabled: true });
  const classRecord = await fixture('classes', { title: 'Clase habitual de prueba', course: course.id });
  const otherClass = await fixture('classes', { title: 'Clase ajena de prueba', course: otherCourse.id });
  await fixture('course_enrollments', { course: course.id, student: student.record.id });
  const collection = 'interactive_lessons';
  const material = JSON.parse(await readFile(new URL('../public/interactive-class-example.json', import.meta.url), 'utf8'));
  const input = { title: 'Material de prueba', course: course.id, class: classRecord.id, status: 'ready', material };

  await denied(() => owner.pb.collection('courses').update(course.id, { interactiveClassesEnabled: true }), 'docente no habilita curso');
  await denied(() => owner.pb.collection(collection).create(input), 'curso deshabilitado');
  await appAdmin.pb.collection('courses').update(course.id, { interactiveClassesEnabled: true });
  await denied(() => outsider.pb.collection(collection).create(input), 'docente ajeno no crea');
  await denied(() => student.pb.collection(collection).create(input), 'alumno no crea');
  await denied(() => owner.pb.collection(collection).create({ ...input, class: otherClass.id }), 'crear con clase ajena');
  const lesson = await owner.pb.collection(collection).create(input);
  created.push({ collection, id: lesson.id });
  assert.equal((await owner.pb.collection(collection).getOne(lesson.id)).title, input.title);
  const enabledCourses = await owner.pb.collection('courses').getFullList({ filter: owner.pb.filter('interactiveClassesEnabled = true && teachers.id ?= {:user}', { user: owner.record.id }), fields: 'id' });
  assert.ok(enabledCourses.some((item) => item.id === course.id), 'el curso aparece en la biblioteca docente');
  const library = await owner.pb.collection(collection).getList(1, 20, {
    filter: owner.pb.filter('course.interactiveClassesEnabled = true && course.teachers.id ?= {:user}', { user: owner.record.id }),
    sort: '-updated,id', expand: 'course,class',
    fields: 'id,course,class,title,description,status,material,updated,expand.course.id,expand.course.title,expand.class.id,expand.class.title',
  });
  assert.ok(library.items.some((item) => item.id === lesson.id && item.expand?.class?.title === classRecord.title), 'la biblioteca lista y expande la clase');
  for (const actor of [outsider, student, appAdmin]) {
    await denied(() => actor.pb.collection(collection).getOne(lesson.id), 'lectura privada');
    const listed = await actor.pb.collection(collection).getList(1, 10, { filter: actor.pb.filter('id = {:id}', { id: lesson.id }) });
    assert.equal(listed.totalItems, 0);
    await denied(() => actor.pb.collection(collection).update(lesson.id, { title: 'Manipulado' }), 'edición ajena');
    await denied(() => actor.pb.collection(collection).delete(lesson.id), 'borrado ajeno');
  }
  await denied(() => owner.pb.collection(collection).update(lesson.id, { course: sameOwnerCourse.id, class: '' }), 'curso inmutable incluso entre cursos propios');
  await denied(() => owner.pb.collection(collection).update(lesson.id, { class: otherClass.id }), 'edición con clase ajena');
  await owner.pb.collection(collection).update(lesson.id, { class: '', status: 'draft' });
  await owner.pb.collection(collection).update(lesson.id, { class: classRecord.id, status: 'ready' });
  await appAdmin.pb.collection('courses').update(course.id, { interactiveClassesEnabled: false });
  await denied(() => owner.pb.collection(collection).getOne(lesson.id), 'deshabilitar oculta');
  await denied(() => owner.pb.collection(collection).update(lesson.id, { title: 'Oculto' }), 'deshabilitar bloquea edición');
  await denied(() => owner.pb.collection(collection).delete(lesson.id), 'deshabilitar bloquea borrado');
  assert.equal((await admin.collection(collection).getOne(lesson.id)).title, input.title);
  await appAdmin.pb.collection('courses').update(course.id, { interactiveClassesEnabled: true });
  await admin.collection('classes').delete(classRecord.id);
  const preserved = await owner.pb.collection(collection).getOne(lesson.id);
  assert.equal(preserved.class, '');
  assert.deepEqual(preserved.material, material);
  await owner.pb.collection(collection).delete(lesson.id);
  console.log('Verificación superada: alcance docente, privacidad, asociación, habilitación, conservación y borrado.');
} catch (error) {
  console.error(`Verificación fallida (${error?.status || 'sin estado'}): ${error?.message || 'Error desconocido'}`);
  process.exitCode = 1;
} finally {
  for (const item of created.reverse()) {
    try { await admin.collection(item.collection).delete(item.id); }
    catch (error) { if (error?.status !== 404) { console.error(`No se pudo limpiar la prueba ${item.collection}/${item.id} (${error?.status || 'sin estado'}).`); process.exitCode = 1; } }
  }
}
