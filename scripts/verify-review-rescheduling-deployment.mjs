import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';

const mode = process.argv[2];
const origin = new URL(process.argv[3] || 'https://epixum.com');
assert.equal(origin.protocol, 'https:');
const path = 'tmp/reviews/rescheduling-deployment.json';
const admin = await testAdmin();
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Read-only baseline for the reported range. Never write to this record.
const realSchedule = async blockId => ({
  block: await admin.collection('review_blocks').getOne(blockId, { fields: 'id,date,start,end,startsAt,endsAt,active' }),
  slots: await admin.collection('review_slots').getFullList({ filter: admin.filter('block = {:block}', { block: blockId }), sort: 'id', fields: 'id,startsAt,endsAt,active' }),
});
const request = async (route, token, options = {}) => {
  const response = await fetch(new URL(route, origin), { ...options, headers: { Cookie: `pb_auth=${token}`, 'Cache-Control': 'no-cache', ...options.headers }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  return { status: response.status, html: await response.text() };
};

if (mode === 'begin') {
  try { await readFile(path); throw new Error('Ya existe un ensayo; usá check o cleanup.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const targetBlockId = process.argv[4];
  assert.match(targetBlockId || '', /^[a-z0-9]{15}$/, 'Indicá la franja real que debe permanecer intacta.');
  const fixture = { created: [], tokens: {}, origin: origin.origin, targetBlockId, targetHash: hash(await realSchedule(targetBlockId)) };
  const create = async (collection, data) => { const record = await admin.collection(collection).create(data); fixture.created.push({ collection, id: record.id }); return record; };
  try {
    const people = {};
    for (const role of ['teacher', 'student']) {
      const password = `ReviewQA-${randomUUID()}!`;
      const record = await create('users', { email: `${randomUUID()}@example.invalid`, name: `Prueba temporal de reprogramación ${role}`, role: 'estudiante', verified: true, password, passwordConfirm: password });
      const pb = new PocketBase(admin.baseURL); await pb.collection('users').authWithPassword(record.email, password);
      fixture.tokens[role] = pb.authStore.token; people[role] = record.id;
    }
    const course = await create('courses', { title: `Prueba temporal de reprogramación ${randomUUID()}`, teachers: [people.teacher], status: 'en curso', reviewsEnabled: true }); fixture.course = course.id;
    await create('course_enrollments', { course: course.id, student: people.student });
    const review = await create('course_reviews', { course: course.id, number: 1, title: 'Reprogramación temporal', instructions: '', open: true, orderedBooking: true, publicationStatus: 'published', revision: randomBytes(12).toString('hex') }); fixture.review = review.id;
    fixture.date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    fixture.nextDate = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
    const startsAt = new Date(`${fixture.date}T15:00:00-03:00`);
    const block = await create('review_blocks', { review: review.id, teacher: people.teacher, active: true, date: fixture.date, start: '15:00', end: '16:00', duration: 15, breakEvery: 0, breakMinutes: 0, startsAt: startsAt.toISOString(), endsAt: new Date(startsAt.getTime() + 3600000).toISOString() }); fixture.block = block.id;
    fixture.slots = [];
    for (let index = 0; index < 4; index++) fixture.slots.push(await create('review_slots', { review: review.id, block: block.id, teacher: people.teacher, active: true, startsAt: new Date(startsAt.getTime() + index * 900000).toISOString(), endsAt: new Date(startsAt.getTime() + (index + 1) * 900000).toISOString() }));
    const booking = await create('review_bookings', { review: review.id, slot: fixture.slots[0].id, student: people.student, status: 'reserved' }); fixture.booking = booking.id;
    await mkdir('tmp/reviews', { recursive: true });
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx' });
    console.log('Ensayo de despliegue preparado con curso, usuarios y reserva temporales; franja real intacta.');
  } catch (error) { await cleanupLiveFixture(admin, fixture); throw error; }
} else {
  const fixture = JSON.parse(await readFile(path, 'utf8')); assert.equal(fixture.origin, origin.origin);
  if (mode === 'cleanup') {
    await cleanupLiveFixture(admin, fixture);
    assert.equal(hash(await realSchedule(fixture.targetBlockId)), fixture.targetHash, 'La franja real cambió durante la verificación.');
    await unlink(path); console.log('Ensayo eliminado; fecha, horarios y turnos de la franja real intactos.');
  } else if (mode === 'check') {
    const route = `/docentes/cursos/${fixture.course}/revisiones/${fixture.review}`;
    const page = await request(route, fixture.tokens.teacher);
    if (page.status !== 200 || !page.html.includes('Desde Editar podés cambiar la fecha conservando los turnos')) {
      console.log(JSON.stringify({ ready: false, status: page.status })); process.exitCode = 2;
    } else {
      let action;
      for (const src of new Set([...page.html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]))) {
        const url = new URL(src, origin); if (url.origin !== origin.origin || !url.pathname.startsWith('/_next/')) continue;
        const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
        const source = await response.text();
        action = source.match(/"([a-f0-9]{40,64})"[^"\n]{0,200}"rescheduleReviewBlockAction"/)?.[1];
        if (action) { assert.ok(source.includes('Confirmar cambio de fecha')); break; }
      }
      assert.ok(action, 'No se encontró la acción publicada de cambio de fecha.');
      const current = await admin.collection('course_reviews').getOne(fixture.review);
      const result = await request(route, fixture.tokens.teacher, { method: 'POST', headers: { 'Next-Action': action, Origin: origin.origin, Accept: 'text/x-component', 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify([fixture.course, fixture.review, current.revision, fixture.block, fixture.nextDate]) });
      assert.equal(result.status, 200, 'El servidor publicado rechazó la acción.');
      assert.ok(result.html.includes('"success":true'), 'La acción publicada no confirmó el cambio.');
      assert.equal((await admin.collection('review_blocks').getOne(fixture.block)).date, fixture.nextDate);
      const movedSlots = await admin.collection('review_slots').getFullList({ filter: admin.filter('block = {:block}', { block: fixture.block }), sort: 'startsAt' });
      assert.deepEqual(movedSlots.map(slot => slot.id), fixture.slots.map(slot => slot.id));
      movedSlots.forEach((slot, index) => assert.equal(Date.parse(slot.startsAt) - Date.parse(fixture.slots[index].startsAt), 86400000));
      assert.equal((await admin.collection('review_bookings').getOne(fixture.booking)).slot, fixture.slots[0].id);
      const studentPage = await request(`/estudiantes/cursos/${fixture.course}/revisiones/${fixture.review}`, fixture.tokens.student);
      assert.equal(studentPage.status, 200); assert.ok(studentPage.html.includes(fixture.nextDate));
      assert.equal(hash(await realSchedule(fixture.targetBlockId)), fixture.targetHash, 'La franja real cambió durante la verificación.');
      console.log(JSON.stringify({ ready: true, deployedAction: true, reservationPreserved: true, slotIdsPreserved: true, studentAgendaUpdated: true, realRangeUnchanged: true }));
    }
  } else throw new Error('Usá begin, check o cleanup.');
}
