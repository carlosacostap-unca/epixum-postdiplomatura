import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';

const mode = process.argv[2];
const origin = new URL(process.argv[3] || 'https://epixum.com');
assert.ok(origin.origin === 'https://epixum.com' || origin.origin === 'http://127.0.0.1:3107');
const path = 'tmp/assessments/student-progress-fixture.json';
const service = await testAdmin();
const targetHash = async () => createHash('sha256').update(JSON.stringify(await service.collection('course_exams').getOne('dspfirstexam001'))).digest('hex');
const request = async (route, token) => {
  const response = await fetch(new URL(route, origin), { headers: { Cookie: `pb_auth=${token}`, 'Cache-Control': 'no-cache' }, redirect: 'manual', signal: AbortSignal.timeout(25000) });
  return { status: response.status, html: await response.text() };
};
if (mode === 'begin') {
  try { await readFile(path); throw new Error('Existe un fixture pendiente: usá check o cleanup.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = { created: [], tokens: {}, people: {}, course: '', targetHash: await targetHash() };
  const create = async (collection, data) => { const record = await service.collection(collection).create(data); fixture.created.push({ collection, id: record.id }); return record; };
  try {
    for (const person of ['teacher', 'outsider', 'active', 'inactive']) {
      const password = `ProgressQA-${randomUUID()}!`;
      const record = await create('users', { name: person === 'active' ? 'Seguimiento Ana Temporal' : `Seguimiento Temporal ${person}`, email: `progress-${randomUUID()}@example.invalid`, role: 'estudiante', password, passwordConfirm: password, verified: true });
      const client = new PocketBase(service.baseURL); await client.collection('users').authWithPassword(record.email, password);
      fixture.people[person] = record.id; fixture.tokens[person] = client.authStore.token;
    }
    const course = await create('courses', { title: `Seguimiento temporal ${randomUUID()}`, status: 'en curso', preparationEnabled: true, examsEnabled: true, teachers: [fixture.people.teacher] }); fixture.course = course.id;
    await create('courses', { title: `Otro curso temporal ${randomUUID()}`, status: 'en curso', teachers: [fixture.people.outsider] });
    for (const person of ['active', 'inactive']) await create('course_enrollments', { course: course.id, student: fixture.people[person] });
    const questions = [{ id: 'q1', prompt: 'Pregunta sintética privada', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'b', explanation: 'Solución privada de seguimiento.' }];
    const quiz = await create('practice_quizzes', { course: course.id, title: 'Práctica temporal repetida', status: 'published', questions });
    await create('practice_quizzes', { course: course.id, title: 'Práctica temporal sin iniciar', status: 'published', questions });
    fixture.practices = [];
    for (let i = 0; i < 2; i++) {
      const attempt = await create('practice_attempts', { course: course.id, student: fixture.people.active, quiz: quiz.id, title: quiz.title, snapshot: { title: quiz.title, questions } }); fixture.practices.push(attempt.id);
      await create('practice_answers', { course: course.id, student: fixture.people.active, attempt: attempt.id, questionId: 'q1', selectedOptionId: i ? 'b' : 'a' });
      await create('practice_results', { course: course.id, student: fixture.people.active, attempt: attempt.id, title: quiz.title, correct: i, total: 1, percentage: i * 100, finishedAt: new Date(Date.now() - (1 - i) * 60000).toISOString(), completionReason: 'submitted', review: [{ question: questions[0], selectedOptionId: i ? 'b' : 'a', correct: !!i }] });
    }
    const exam = await create('course_exams', { course: course.id, title: 'Parcial temporal de seguimiento', status: 'published', opensAt: new Date(Date.now() - 60000).toISOString(), closesAt: new Date(Date.now() + 86400000).toISOString(), questions }); fixture.exam = exam.id;
    const draft = await create('course_exams', { course: course.id, title: 'Borrador temporal privado', status: 'draft', questions }); fixture.draft = draft.id;
    const attempt = await create('course_exam_attempts', { course: course.id, student: fixture.people.active, exam: exam.id, title: exam.title, deadline: exam.closesAt, snapshot: { title: exam.title, questions } }); fixture.examAttempt = attempt.id;
    await create('course_exam_results', { course: course.id, student: fixture.people.active, exam: exam.id, attempt: attempt.id, finishedAt: new Date().toISOString(), reason: 'submitted', correct: 0, total: 1, percentage: 0, selected: { q1: 'a' } });
    await mkdir('tmp/assessments', { recursive: true }); await writeFile(path, JSON.stringify(fixture), { flag: 'wx' });
    console.log('Fixture aislado de seguimiento preparado; el parcial real sigue intacto.');
  } catch (error) { await cleanupLiveFixture(service, fixture); throw error; }
} else {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  if (mode === 'cleanup') {
    await cleanupLiveFixture(service, fixture); assert.equal(await targetHash(), fixture.targetHash); await unlink(path);
    console.log('Datos y credenciales temporales eliminados; parcial real intacto.');
  } else if (mode === 'check') {
    const base = `/docentes/cursos/${fixture.course}/estudiantes`;
    const listing = await request(base, fixture.tokens.teacher);
    if (listing.status !== 200 || !listing.html.includes('Seguimiento de estudiantes')) { console.log(JSON.stringify({ ready: false, status: listing.status })); process.exitCode = 2; }
    else {
      const home = await request(`/docentes/cursos/${fixture.course}`, fixture.tokens.teacher);
      assert.equal(home.status, 200); assert.ok(home.html.includes('Ver seguimiento y filtrar estudiantes'));
      assert.ok(listing.html.includes(`${base}/${fixture.people.active}`)); assert.ok(listing.html.includes(`${base}/${fixture.people.inactive}`));
      assert.ok(listing.html.includes('prácticas publicadas finalizadas')); assert.ok(listing.html.includes('0 / 10')); assert.ok(listing.html.includes('Sin nota'));
      assert.ok(!listing.html.includes(fixture.draft)); assert.ok(!listing.html.includes('Solución privada de seguimiento.')); assert.ok(!listing.html.includes('correctOptionId'));
      const filtered = await request(`${base}?q=Ana&preparacion=completed&parcial=${fixture.exam}&estado_parcial=submitted&nota_max=0&actividad=recent7`, fixture.tokens.teacher);
      assert.equal(filtered.status, 200); assert.ok(filtered.html.includes(`${base}/${fixture.people.active}`)); assert.ok(!filtered.html.includes(`${base}/${fixture.people.inactive}`));
      const inactive = await request(`${base}?actividad=none`, fixture.tokens.teacher);
      assert.ok(inactive.html.includes(`${base}/${fixture.people.inactive}`)); assert.ok(!inactive.html.includes(`${base}/${fixture.people.active}`));
      const detail = await request(`${base}/${fixture.people.active}?q=Ana`, fixture.tokens.teacher);
      assert.equal(detail.status, 200); assert.ok(detail.html.includes('Historial de ')); assert.ok(detail.html.includes('Seguimiento Ana Temporal'));
      for (const id of fixture.practices) assert.ok(detail.html.includes(`/preparacion/intentos/${id}`));
      assert.ok(detail.html.includes(`/parciales/intentos/${fixture.examAttempt}`)); assert.ok(detail.html.includes('Ver devolución completa')); assert.ok(detail.html.includes('estudiantes?q=Ana'));
      for (const person of ['active', 'outsider']) {
        const denied = await request(base, fixture.tokens[person]); assert.ok(!denied.html.includes('Seguimiento Ana Temporal')); assert.ok(!denied.html.includes(`${base}/${fixture.people.active}`));
      }
      const foreign = await request(`${base}/${fixture.people.outsider}`, fixture.tokens.teacher); assert.ok(!foreign.html.includes('Historial de'));
      assert.equal(await targetHash(), fixture.targetHash);
      console.log(JSON.stringify({ ready: true, teacherDashboard: true, combinedFilters: true, zeroVsNoGrade: true, practiceHistory: true, feedbackLinks: true, studentAndForeignTeacherDenied: true, foreignStudentDenied: true, realExamUnchanged: true }));
    }
  } else throw new Error('Usá begin, check o cleanup.');
}
