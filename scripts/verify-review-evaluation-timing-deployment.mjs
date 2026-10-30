import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import PocketBase from 'pocketbase';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';

const origin = new URL(process.argv[2] || 'https://epixum.com');
assert.equal(origin.protocol, 'https:');
const admin = await testAdmin();
const fixture = { created: [] };
const create = async (collection, data) => {
  const record = await admin.collection(collection).create(data);
  fixture.created.push({ collection, id: record.id }); return record;
};
const request = async (route, token, options = {}) => {
  const response = await fetch(new URL(route, origin), { ...options, headers: { Cookie: `pb_auth=${token}`, 'Cache-Control': 'no-cache', ...options.headers }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  return { status: response.status, html: await response.text() };
};

try {
  const people = {};
  for (const role of ['teacher', 'student', 'futureStudent']) {
    const password = `ReviewTimingQA-${randomUUID()}!`;
    const user = await create('users', { email: `${randomUUID()}@example.invalid`, name: `Prueba temporal de evaluación ${role}`, role: 'estudiante', verified: true, password, passwordConfirm: password });
    const pb = new PocketBase(admin.baseURL); await pb.collection('users').authWithPassword(user.email, password);
    people[role] = { id: user.id, token: pb.authStore.token };
  }
  const course = await create('courses', { title: `Prueba temporal de evaluación ${randomUUID()}`, teachers: [people.teacher.id], status: 'en curso', reviewsEnabled: true });
  await create('course_enrollments', { course: course.id, student: people.student.id });
  await create('course_enrollments', { course: course.id, student: people.futureStudent.id });
  const review = await create('course_reviews', { course: course.id, number: 1, title: 'Evaluación en curso temporal', open: true, publicationStatus: 'published', revision: randomBytes(12).toString('hex') });
  const start = Date.now() - 60000;
  const block = await create('review_blocks', { review: review.id, teacher: people.teacher.id, active: true, date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }), start: '00:00', end: '23:59', duration: 15, startsAt: new Date(start).toISOString(), endsAt: new Date(start + 1800000).toISOString() });
  const slots = [];
  const bookings = [];
  for (const offset of [0, 86400000]) {
    const slot = await create('review_slots', { review: review.id, block: block.id, teacher: people.teacher.id, active: true, startsAt: new Date(start + offset).toISOString(), endsAt: new Date(start + offset + 1800000).toISOString() });
    slots.push(slot);
    bookings.push(await create('review_bookings', { review: review.id, slot: slot.id, student: offset ? people.futureStudent.id : people.student.id, status: 'reserved' }));
  }
  const route = `/docentes/cursos/${course.id}/revisiones/${review.id}`;
  const page = await request(route, people.teacher.token);
  if (page.status !== 200 || !page.html.includes('La evaluación se habilita al comenzar el turno.')) {
    console.log(JSON.stringify({ ready: false, status: page.status })); process.exitCode = 2;
  } else {
    assert.ok(page.html.includes('Evaluar turno: resultado, devolución y notas privadas'));
    let action;
    for (const src of new Set([...page.html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]))) {
      const url = new URL(src, origin); if (url.origin !== origin.origin || !url.pathname.startsWith('/_next/')) continue;
      const source = await (await fetch(url, { signal: AbortSignal.timeout(20000) })).text();
      action = source.match(/"([a-f0-9]{40,64})"[^"\n]{0,200}"evaluateReviewAction"/)?.[1];
      if (action) break;
    }
    assert.ok(action, 'No se encontró la acción publicada de evaluación.');
    const input = { attendance: 'present', status: 'passed', feedback: 'Objetivo alcanzado en ensayo temporal.', teacherNotes: `Nota privada temporal ${randomUUID()}` };
    const evaluate = booking => request(route, people.teacher.token, { method: 'POST', headers: { 'Next-Action': action, Origin: origin.origin, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify([course.id, review.id, booking.id, input]) });
    const future = await evaluate(bookings[1]);
    assert.equal(future.status, 200); assert.ok(future.html.includes('"success":false'));
    assert.equal((await admin.collection('review_bookings').getOne(bookings[1].id)).status, 'reserved');
    assert.ok(Date.parse(slots[0].endsAt) > Date.now(), 'El turno sintético debe seguir en curso.');
    const current = await evaluate(bookings[0]);
    assert.equal(current.status, 200); assert.ok(current.html.includes('"success":true'), 'La acción no confirmó la evaluación durante el turno.');
    const stored = await admin.collection('review_bookings').getOne(bookings[0].id);
    assert.equal(stored.status, 'passed'); assert.equal(stored.feedback, input.feedback);
    const notes = await admin.collection('review_booking_notes').getFullList({ filter: admin.filter('booking = {:booking}', { booking: stored.id }) });
    assert.equal(notes.length, 1); assert.equal(notes[0].notes, input.teacherNotes);
    const studentPage = await request(`/estudiantes/cursos/${course.id}/revisiones/${review.id}`, people.student.token);
    assert.equal(studentPage.status, 200); assert.ok(studentPage.html.includes(input.feedback)); assert.ok(!studentPage.html.includes(input.teacherNotes));
    const repeat = await evaluate(bookings[0]); assert.ok(repeat.html.includes('"success":false'));
    console.log(JSON.stringify({ ready: true, evaluationDuringSlot: true, privateNotesSaved: true, notesHiddenFromStudent: true, futureEvaluationRejected: true, overwriteRejected: true }));
  }
} finally {
  await cleanupLiveFixture(admin, fixture);
  console.log('Usuarios, curso, turnos y reservas del ensayo eliminados.');
}
