import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';

const admin = await testAdmin();
const path = 'output/playwright/publication-fixture.json';
if (process.argv.includes('--cleanup')) {
  await cleanupLiveFixture(admin, JSON.parse(await readFile(path, 'utf8')));
  for (const file of [path, 'output/playwright/publication-teacher.json', 'output/playwright/publication-student.json']) await unlink(file);
  console.log('Registros y sesiones temporales eliminados.');
  process.exit(0);
}
const fixture = { created: [] };
let keep = false;
const create = async (name, data, pb = admin) => {
  const record = await pb.collection(name).create(data);
  fixture.created.push({ collection: name, id: record.id }); return record;
};
const user = async role => {
  const password = `Publication-${randomUUID()}!`;
  const record = await create('users', { email: `publication-${randomUUID()}@example.invalid`, password, passwordConfirm: password, verified: true, name: 'Prueba publicación', role });
  const pb = new PocketBase(admin.baseURL); pb.autoCancellation(false);
  await pb.collection('users').authWithPassword(record.email, password);
  return { id: record.id, pb };
};
const denied = async (fn, label) => {
  await assert.rejects(fn, error => [400, 403, 404].includes(error.status), label);
};
try {
  const teacher = await user('estudiante'); // Course relationship grants teaching rights.
  const student = await user('estudiante');
  const outsider = await user('docente');
  const appAdmin = await user('admin');
  const course = await create('courses', { title: 'Prueba de publicación', status: 'en curso', teachers: [teacher.id], organizationMode: 'tradicional', contentsEnabled: true });
  await create('course_enrollments', { course: course.id, student: student.id });
  const cls = await create('classes', { title: 'Clase de prueba', course: course.id });
  const tp = await create('assignments', { title: 'Trabajo en preparación', description: '<p>Consigna privada de prueba</p>', course: course.id, publicationStatus: 'draft' }, teacher.pb);
  const legacy = await create('assignments', { title: 'Trabajo anterior', course: course.id });
  const content = await create('course_contents', { title: 'Contenido independiente', course: course.id });
  const resource = (parent, publicationStatus, title) => create('links', { ...parent, title, url: 'https://example.com/material', type: 'link', ...(publicationStatus ? { publicationStatus } : {}) }, teacher.pb);
  const draft = await resource({ class: cls.id }, 'draft', 'Recurso de clase en borrador');
  const published = await resource({ class: cls.id }, 'published', 'Recurso de clase publicado');
  const old = await resource({ class: cls.id }, '', 'Recurso anterior');
  const tpResource = await resource({ assignment: tp.id }, 'published', 'Recurso del trabajo publicado');
  const tpDraft = await resource({ assignment: tp.id }, 'draft', 'Recurso del trabajo en borrador');
  const independent = await resource({ content: content.id }, '', 'Recurso independiente');
  const filter = student.pb.filter('class = {:id}', { id: cls.id });
  assert.deepEqual((await student.pb.collection('links').getFullList({ filter, sort: 'title' })).map(r => r.id).sort(), [published.id, old.id].sort());
  await denied(() => student.pb.collection('links').getOne(draft.id), 'No consultar borrador por id');
  await denied(() => student.pb.collection('assignments').getOne(tp.id), 'No consultar TP en borrador');
  await denied(() => student.pb.collection('links').getOne(tpResource.id), 'No consultar recurso publicado de TP en borrador');
  assert.equal((await student.pb.collection('assignments').getOne(legacy.id)).id, legacy.id);
  assert.equal((await student.pb.collection('links').getOne(independent.id)).id, independent.id);
  for (const manager of [teacher, appAdmin]) {
    assert.equal((await manager.pb.collection('links').getOne(draft.id)).id, draft.id);
    assert.equal((await manager.pb.collection('assignments').getOne(tp.id)).id, tp.id);
  }
  await denied(() => outsider.pb.collection('links').getOne(draft.id), 'Docente ajeno');
  await denied(() => outsider.pb.collection('assignments').update(tp.id, { publicationStatus: 'published' }), 'No publicar TP ajeno');
  await denied(() => student.pb.collection('links').update(draft.id, { publicationStatus: 'published' }), 'Estudiante no publica');
  await denied(() => student.pb.collection('deliveries').create({ assignment: tp.id, student: student.id, repositoryUrl: 'https://example.com/entrega' }), 'No entregar a borrador por API');
  await teacher.pb.collection('assignments').update(tp.id, { publicationStatus: 'published' });
  assert.equal((await student.pb.collection('assignments').getOne(tp.id)).id, tp.id);
  assert.equal((await student.pb.collection('links').getOne(tpResource.id)).id, tpResource.id);
  await denied(() => student.pb.collection('links').getOne(tpDraft.id), 'Publicar TP no publica adjuntos');
  await teacher.pb.collection('links').update(draft.id, { publicationStatus: 'published' });
  assert.equal((await student.pb.collection('links').getOne(draft.id)).id, draft.id);
  await teacher.pb.collection('links').update(draft.id, { publicationStatus: 'draft' });
  await denied(() => student.pb.collection('links').getOne(draft.id), 'Volver recurso a borrador');
  await teacher.pb.collection('assignments').update(tp.id, { publicationStatus: 'draft' });
  await denied(() => student.pb.collection('links').getOne(tpResource.id), 'Volver TP a borrador');
  // Weekly visibility must compose with publication.
  await admin.collection('courses').update(course.id, { organizationMode: 'semanal' });
  const week = await create('course_weeks', { course: course.id, title: 'Unidad de prueba', number: 1, status: 'borrador' });
  await admin.collection('classes').update(cls.id, { week: week.id });
  await admin.collection('assignments').update(tp.id, { week: week.id, publicationStatus: 'published' });
  await denied(() => student.pb.collection('assignments').getOne(tp.id), 'Unidad oculta');
  await denied(() => student.pb.collection('links').getOne(published.id), 'Recurso de unidad oculta');
  await admin.collection('course_weeks').update(week.id, { status: 'publicada' });
  assert.equal((await student.pb.collection('links').getOne(published.id)).id, published.id);
  assert.equal((await student.pb.collection('assignments').getOne(tp.id)).id, tp.id);
  await denied(() => student.pb.collection('links').getOne(draft.id), 'Unidad publicada no publica recursos');
  console.log('Permisos verificados: listados, IDs directos, transiciones, compatibilidad, matrícula, docencia contextual, admin, unidad y entregas.');
  if (process.argv.includes('--keep-for-browser')) {
    await admin.collection('courses').update(course.id, { organizationMode: 'tradicional' });
    await admin.collection('assignments').update(tp.id, { publicationStatus: 'draft' });
    Object.assign(fixture, { course: course.id, class: cls.id, assignment: tp.id, draftResource: draft.id });
    await mkdir('output/playwright', { recursive: true });
    for (const [label, account] of [['teacher', teacher], ['student', student]]) {
      await writeFile(`output/playwright/publication-${label}.json`, JSON.stringify({ cookies: [{ name: 'pb_auth', value: account.pb.authStore.token, domain: 'localhost', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }));
    }
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx' });
    keep = true;
    console.log(JSON.stringify({ course: course.id, class: cls.id, assignment: tp.id }));
  }
} catch (error) {
  console.error('Verificación fallida:', error.status || '', error.message, error.stack?.split('\n').find(line => line.includes('verify-resource-publication-access.mjs')) || '');
  process.exitCode = 1;
} finally {
  if (!keep) await cleanupLiveFixture(admin, fixture);
}
