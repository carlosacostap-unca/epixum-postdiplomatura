import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import assert from 'node:assert/strict';
import PocketBase from 'pocketbase';
import { testAdmin } from './live-test-fixtures.mjs';

const directory = 'backups/pocketbase/onboarding-qa';
const fixturePath = directory + '/fixture.json';
const admin = await testAdmin();
const command = process.argv[2];
if (command === 'create') {
  const prefix = 'onboarding-qa-' + randomUUID().slice(0, 8);
  const created = [];
  const make = async (collection, data) => { const result = await admin.collection(collection).create(data); created.push({ collection, id: result.id }); return result; };
  try {
    const people = {};
    await mkdir(directory, { recursive: true });
    for (const role of ['student', 'teacher', 'outsider']) {
      const password = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
      const user = await make('users', { email: `${prefix}-${role}@example.invalid`, password, passwordConfirm: password, verified: true, role: 'estudiante', firstName: 'Maria', lastName: 'Prueba', name: 'Maria Prueba', dni: '12345678', birthDate: '1995-10-03 12:00:00.000Z', phone: '3834000000' });
      const client = new PocketBase(admin.baseURL);
      await client.collection('users').authWithPassword(user.email, password);
      people[role] = { id: user.id, email: user.email };
      // Browser state contains only temporary test credentials, never real users.
      await writeFile(`${directory}/${role}-state.json`, JSON.stringify({ cookies: [{ name: 'pb_auth', value: client.authStore.token, domain: 'localhost', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] }));
      for (const collection of ['course_onboarding', 'course_onboarding_surveys']) {
        await assert.rejects(client.collection(collection).getList(1, 1), error => [403, 404].includes(error.status));
      }
    }
    const course = await make('courses', { title: prefix, status: 'en curso', enrollmentMode: 'invitacion_contrasena', teachers: [people.teacher.id], onboardingEnabled: true });
    await make('course_enrollment_invitations', { course: course.id, emailNormalized: people.student.email, status: 'pendiente' });
    const fixture = { prefix, created, people, course: course.id };
    await writeFile(fixturePath, JSON.stringify(fixture), { flag: 'wx' });
    console.log(JSON.stringify({ courseId: course.id, directReadsBlocked: true, fixturePath }));
  } catch (error) {
    for (const record of created.reverse()) await admin.collection(record.collection).delete(record.id);
    throw error;
  }
} else {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));
  const course = await admin.collection('courses').getOne(fixture.course);
  assert.equal(course.title, fixture.prefix);
  if (command === 'enroll') {
    const enrollment = await admin.collection('course_enrollments').create({ course: fixture.course, student: fixture.people.student.id });
    fixture.created.push({ collection: 'course_enrollments', id: enrollment.id });
    await writeFile(fixturePath, JSON.stringify(fixture));
    console.log('Matrícula creada únicamente para el alumno temporal.');
  } else if (command === 'verify') {
    const filter = admin.filter('course = {:course} && student = {:student}', { course: fixture.course, student: fixture.people.student.id });
    const progress = await admin.collection('course_onboarding').getFirstListItem(filter);
    const survey = await admin.collection('course_onboarding_surveys').getFirstListItem(filter);
    assert.ok(progress.profileConfirmedAt && progress.requirementsAcceptedAt && progress.completedAt);
    assert.equal(survey.version, 1);
    assert.equal(survey.answers.experience, 'never');
    assert.equal(survey.answers.paidAccess[0], 'institution');
    assert.equal((await admin.collection('course_onboarding_surveys').getList(1, 1, { filter })).totalItems, 1);
    for (const role of ['student', 'teacher', 'outsider']) {
      const state = JSON.parse(await readFile(`${directory}/${role}-state.json`, 'utf8'));
      const client = new PocketBase(admin.baseURL); client.authStore.save(state.cookies[0].value);
      await assert.rejects(client.collection('course_onboarding').update(progress.id, { completedAt: '' }), error => [403, 404].includes(error.status));
      await assert.rejects(client.collection('course_onboarding_surveys').getOne(survey.id), error => [403, 404].includes(error.status));
      await assert.rejects(client.collection('course_onboarding_surveys').create({ course: fixture.course, student: fixture.people.outsider.id, answers: { forged: true }, version: 1 }), error => [403, 404].includes(error.status));
    }
    console.log('Persistencia, encuesta única y bloqueo de lecturas/escrituras directas verificados.');
  } else if (command === 'cleanup') {
    for (const person of Object.values(fixture.people)) assert.ok(person.email.startsWith(fixture.prefix));
    for (const record of [...fixture.created].reverse()) {
      try { await admin.collection(record.collection).delete(record.id); } catch (error) { if (error.status !== 404) throw error; }
    }
    for (const role of ['student', 'teacher', 'outsider']) await unlink(`${directory}/${role}-state.json`);
    await unlink(fixturePath);
    console.log('Registros y credenciales de prueba eliminados.');
  } else throw new Error('Usá create, enroll, verify o cleanup.');
}
