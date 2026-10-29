import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';

const mode = process.argv[2];
const origin = new URL(process.argv[3] || 'https://epixum.com');
assert.equal(origin.protocol, 'https:');
const path = 'tmp/reviews/contact-deployment.json';
const admin = await testAdmin();

if (mode === 'begin') {
  try { await readFile(path); throw new Error('Ya existe un ensayo: usá check o cleanup.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = { created: [], tokens: {}, contacts: [], origin: origin.origin };
  const create = async (collection, data) => { const record = await admin.collection(collection).create(data); fixture.created.push({ collection, id: record.id }); return record; };
  try {
    const people = {};
    for (const [role, name, phone] of [['teacher', 'Docente Contacto QA', ''], ['student', 'Alumna Contacto QA', '3834000000'], ['other', 'Otro Alumno Contacto QA', '3834000001']]) {
      const password = `ContactQA-${randomUUID()}!`;
      const record = await create('users', { email: `${randomUUID()}@example.invalid`, name, phone, role: 'estudiante', verified: true, password, passwordConfirm: password });
      const pb = new PocketBase(admin.baseURL); await pb.collection('users').authWithPassword(record.email, password);
      fixture.tokens[role] = pb.authStore.token; people[role] = record.id;
      if (role !== 'teacher') fixture.contacts.push({ email: record.email, phone });
    }
    const course = await create('courses', { title: `Prueba temporal de contactos ${randomUUID()}`, teachers: [people.teacher], status: 'en curso', reviewsEnabled: true }); fixture.course = course.id;
    const review = await create('course_reviews', { course: course.id, number: 1, title: 'Contacto de reservas temporal', instructions: '', open: true, orderedBooking: true, publicationStatus: 'published', revision: randomBytes(12).toString('hex') }); fixture.review = review.id;
    const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const start = new Date(`${date}T15:00:00-03:00`).getTime();
    const block = await create('review_blocks', { review: review.id, teacher: people.teacher, active: true, date, start: '15:00', end: '15:30', duration: 15, breakEvery: 0, breakMinutes: 0, startsAt: new Date(start).toISOString(), endsAt: new Date(start + 1800000).toISOString() });
    for (const [index, role] of ['student', 'other'].entries()) {
      await create('course_enrollments', { course: course.id, student: people[role] });
      const slot = await create('review_slots', { review: review.id, block: block.id, teacher: people.teacher, active: true, startsAt: new Date(start + index * 900000).toISOString(), endsAt: new Date(start + (index + 1) * 900000).toISOString() });
      await create('review_bookings', { review: review.id, slot: slot.id, student: people[role], status: 'reserved' });
    }
    await mkdir('tmp/reviews', { recursive: true });
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx' });
    console.log('Ensayo de contactos preparado con docentes, alumnos y reservas ficticios.');
  } catch (error) { await cleanupLiveFixture(admin, fixture); throw error; }
} else {
  const fixture = JSON.parse(await readFile(path, 'utf8')); assert.equal(fixture.origin, origin.origin);
  if (mode === 'cleanup') {
    await cleanupLiveFixture(admin, fixture); await unlink(path);
    console.log('Usuarios, curso, reservas y credenciales del ensayo eliminados.');
  } else if (mode === 'check') {
    const request = async (workspace, role) => {
      const response = await fetch(new URL(`/${workspace}/cursos/${fixture.course}/revisiones/${fixture.review}`, origin), { headers: { Cookie: `pb_auth=${fixture.tokens[role]}`, 'Cache-Control': 'no-cache' }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
      return { status: response.status, html: await response.text() };
    };
    const teacher = await request('docentes', 'teacher');
    if (teacher.status !== 200 || !teacher.html.includes('Ver detalle del turno de Alumna Contacto QA')) {
      console.log(JSON.stringify({ ready: false, status: teacher.status })); process.exitCode = 2;
    } else {
      for (const contact of fixture.contacts) { assert.ok(teacher.html.includes(contact.email)); assert.ok(teacher.html.includes(contact.phone)); }
      const student = await request('estudiantes', 'student'); assert.equal(student.status, 200);
      assert.ok(!student.html.includes('studentContacts'));
      assert.ok(!student.html.includes(fixture.contacts[1].email)); assert.ok(!student.html.includes(fixture.contacts[1].phone));
      assert.ok(!student.html.includes('Ver detalle del turno de'));
      const other = await request('estudiantes', 'other'); assert.equal(other.status, 200);
      assert.ok(!other.html.includes(fixture.contacts[0].email)); assert.ok(!other.html.includes(fixture.contacts[0].phone));
      console.log(JSON.stringify({ ready: true, reservedCardsClickable: true, teacherContactsAvailable: true, contactsHiddenFromOtherStudents: true, messagesSent: false }));
    }
  } else throw new Error('Usá begin, check o cleanup.');
}
