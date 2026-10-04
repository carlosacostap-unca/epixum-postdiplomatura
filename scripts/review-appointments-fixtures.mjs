import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';

const directory = 'tmp/reviews';
const path = `${directory}/fixture.json`;
const admin = await testAdmin();
const operation = process.argv[2];
if (operation === 'create') {
  await mkdir(directory, { recursive: true });
  try { await readFile(path); throw new Error('Ya existe un fixture; limpiarlo antes de crear otro.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = { created: [], course: '', review: '' };
  const create = async (collection, data) => { const record = await admin.collection(collection).create(data); fixture.created.push({ collection, id: record.id }); return record; };
  try {
    const user = async (label, name) => {
      const password = `Review-${randomUUID()}!`;
      const record = await create('users', { email: `${randomUUID()}@example.invalid`, name, firstName: name.split(' ')[0], lastName: name.split(' ').slice(1).join(' '), role: 'estudiante', verified: true, password, passwordConfirm: password });
      const pb = new PocketBase(admin.baseURL); await pb.collection('users').authWithPassword(record.email, password);
      const state = { cookies: [{ name: 'pb_auth', value: pb.authStore.token, domain: 'localhost', path: '/', expires: -1, httpOnly: true, secure: false, sameSite: 'Lax' }], origins: [] };
      await writeFile(`${directory}/${label}.json`, JSON.stringify(state), { flag: 'wx' });
      return record;
    };
    const teacher = await user('teacher', 'Ana Martínez');
    const peer = await user('peer', 'Diego López');
    const student = await user('student', 'Lucía Fernández');
    const course = await create('courses', { title: 'Demostración · Revisiones por turnos', teachers: [teacher.id, peer.id], status: 'en curso', reviewsEnabled: true });
    fixture.course = course.id;
    await create('course_enrollments', { course: course.id, student: student.id });
    const review = await create('course_reviews', { course: course.id, number: 1, title: 'Avances del proyecto', instructions: 'Prepará una demostración de tu avance y anotá las dudas que quieras revisar con el equipo docente.', open: true, revision: randomBytes(12).toString('hex') });
    fixture.review = review.id;
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx' });
    console.log(JSON.stringify({ course: fixture.course, review: fixture.review }));
  } catch (error) { await cleanupLiveFixture(admin, fixture); throw error; }
} else if (operation === 'advance') {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  const bookings = await admin.collection('review_bookings').getFullList({ filter: admin.filter('review = {:review} && status = "reserved"', { review: fixture.review }) });
  for (const booking of bookings) await admin.collection('review_slots').update(booking.slot, { startsAt: new Date(Date.now() - 3600000).toISOString(), endsAt: new Date(Date.now() - 1800000).toISOString() });
  console.log('Turnos reservados del fixture adelantados para comprobar evaluación.');
} else if (operation === 'cleanup') {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  await cleanupLiveFixture(admin, fixture);
  for (const name of ['fixture', 'teacher', 'peer', 'student']) await unlink(`${directory}/${name}.json`);
  console.log('Datos y credenciales temporales de revisiones eliminados.');
} else throw new Error('Usá create, advance o cleanup.');
