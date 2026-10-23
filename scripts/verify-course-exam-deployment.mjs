import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin } from './live-test-fixtures.mjs';

// Each invocation is bounded. Temporary credentials stay in ignored tmp/.
const mode = process.argv[2];
const origin = new URL(process.argv[3] || 'https://epixum.com');
assert.equal(origin.protocol, 'https:');
const path = 'tmp/assessments/deployment-fixture.json';
const service = await testAdmin();
const hash = record => createHash('sha256').update(JSON.stringify(record)).digest('hex');
const target = () => service.collection('course_exams').getOne('dspfirstexam001');
const request = async (route, token) => {
  const response = await fetch(new URL(route, origin), { headers: { Cookie: `pb_auth=${token}`, 'Cache-Control': 'no-cache' }, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  return { status: response.status, html: await response.text() };
};
async function verify() {
let fixture;
if (mode === 'begin') {
  try { await readFile(path); throw new Error('Ya existe un fixture: usá check o cleanup.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const exam = await target();
  assert.equal(exam.status, 'draft');
  fixture = { created: [], origin: origin.origin, targetHash: hash(exam), course: '', attempt: '', published: '', draft: '', tokens: {} };
  const create = async (collection, data) => { const record = await service.collection(collection).create(data); fixture.created.push({ collection, id: record.id }); return record; };
  try {
    const people = {};
    for (const role of ['admin', 'student']) {
      const password = `ExamQA-${randomUUID()}!`;
      const record = await create('users', { email: `exam-deploy-${randomUUID()}@example.invalid`, name: `Verificación temporal de parciales ${role}`, role: role === 'admin' ? 'admin' : 'estudiante', password, passwordConfirm: password, verified: true });
      const client = new PocketBase(service.baseURL);
      await client.collection('users').authWithPassword(record.email, password);
      people[role] = record.id; fixture.tokens[role] = client.authStore.token;
    }
    const course = await create('courses', { title: `Verificación de despliegue ${randomUUID()}`, status: 'en curso', examsEnabled: true }); fixture.course = course.id;
    await create('course_enrollments', { course: course.id, student: people.student });
    const questions = [1, 2].map(n => ({ id: `q${n}`, prompt: `Pregunta sintética ${n}`, options: [{ id: 'a', label: 'Opción A' }, { id: 'b', label: 'Opción B' }], correctOptionId: 'b', explanation: 'Explicación sintética privada.' }));
    const data = { course: course.id, title: `Parcial público temporal ${randomUUID()}`, description: 'Comprobación de despliegue.', status: 'published', opensAt: new Date(Date.now() - 60000).toISOString(), closesAt: new Date(Date.now() + 3600000).toISOString(), questions };
    const published = await create('course_exams', data); fixture.published = published.id;
    const draft = await create('course_exams', { ...data, title: `Borrador reservado temporal ${randomUUID()}`, status: 'draft', opensAt: '', closesAt: '' }); fixture.draft = draft.id;
    const snapshot = Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'course'));
    const attempt = await create('course_exam_attempts', { course: course.id, exam: published.id, student: people.student, title: data.title, snapshot, deadline: data.closesAt, cameraActive: false }); fixture.attempt = attempt.id;
    await create('course_exam_answers', { course: course.id, student: people.student, attempt: attempt.id, questionId: 'q1', optionId: 'b', mutationId: randomUUID() });
    const earlyExam = await create('course_exams', { ...data, title: `Entrega anticipada temporal ${randomUUID()}` });
    const earlyAttempt = await create('course_exam_attempts', { course: course.id, exam: earlyExam.id, student: people.student, title: earlyExam.title, snapshot: { ...snapshot, title: earlyExam.title }, deadline: data.closesAt, cameraActive: false }); fixture.earlyAttempt = earlyAttempt.id;
    await create('course_exam_results', { course: course.id, exam: earlyExam.id, student: people.student, attempt: earlyAttempt.id, finishedAt: new Date().toISOString(), reason: 'submitted', correct: 1, total: 2, percentage: 50, selected: { q1: 'b' } });
    await mkdir('tmp/assessments', { recursive: true });
    await writeFile(path, JSON.stringify(fixture), { flag: 'wx' });
    console.log('Fixture aislado preparado; primer parcial real confirmado en borrador.');
  } catch (error) {
    for (const row of [...fixture.created].reverse()) await service.collection(row.collection).delete(row.id);
    throw error;
  }
} else {
  fixture = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(fixture.origin, origin.origin);
  if (mode === 'check') {
    const admin = await request('/admin/courses/6taf9vkwwi8oxlz/parciales', fixture.tokens.admin);
    if (admin.status !== 200 || !admin.html.includes('dspfirstexam001')) { console.log(JSON.stringify({ ready: false, status: admin.status })); process.exitCode = 2; return; }
    assert.ok(admin.html.includes('Borrador'));
    const student = await request(`/estudiantes/cursos/${fixture.course}/parciales`, fixture.tokens.student);
    assert.equal(student.status, 200); assert.ok(student.html.includes(fixture.published)); assert.ok(!student.html.includes(fixture.draft));
    assert.ok(!student.html.includes('correctOptionId'));
    const config = await request('/admin/courses/6taf9vkwwi8oxlz', fixture.tokens.admin);
    assert.equal(config.status, 200); assert.ok(config.html.includes('examsEnabled'));
    assert.equal(hash(await target()), fixture.targetHash, 'El parcial real debe permanecer intacto.');
    if (!fixture.workerDeadline) {
      const early = await request(`/estudiantes/cursos/${fixture.course}/parciales/intentos/${fixture.earlyAttempt}`, fixture.tokens.student);
      if (early.status !== 200 || !early.html.includes('La nota y la devolución completa estarán disponibles a partir del cierre')) { console.log(JSON.stringify({ ready: false, reason: 'feedback-version-pending' })); process.exitCode = 2; return; }
      assert.ok(!early.html.includes('Explicación sintética privada.')); assert.ok(!early.html.includes('correctOptionId')); assert.ok(!early.html.includes('Nota:'));
      fixture.workerDeadline = new Date(Date.now() + 2000).toISOString();
      await service.collection('course_exam_attempts').update(fixture.attempt, { deadline: fixture.workerDeadline });
      await service.collection('course_exam_attempts').update(fixture.earlyAttempt, { deadline: fixture.workerDeadline });
      await writeFile(path, JSON.stringify(fixture));
      console.log(JSON.stringify({ ready: true, adminSection: true, studentSection: true, draftHidden: true, realDraftUnchanged: true, earlyFeedbackHidden: true, worker: 'armed' }));
    } else {
      const result = (await service.collection('course_exam_results').getList(1, 1, { filter: service.filter('attempt = {:id}', { id: fixture.attempt }) })).items[0];
      if (!result) { console.log(JSON.stringify({ ready: true, worker: 'pending' })); process.exitCode = 2; return; }
      assert.equal(result.reason, 'expired'); assert.equal(result.correct, 1); assert.equal(result.total, 2);
      assert.equal(Date.parse(result.finishedAt), Date.parse(fixture.workerDeadline));
      const feedback = await request(`/estudiantes/cursos/${fixture.course}/parciales/intentos/${fixture.earlyAttempt}`, fixture.tokens.student);
      assert.equal(feedback.status, 200); assert.ok(feedback.html.includes('Resultado y devolución completa')); assert.ok(feedback.html.includes('Explicación sintética privada.')); assert.ok(feedback.html.includes('Respuesta correcta')); assert.ok(feedback.html.includes('Sin responder')); assert.ok(feedback.html.includes('Nota:'));
      console.log(JSON.stringify({ ready: true, adminSection: true, studentSection: true, draftHidden: true, realDraftUnchanged: true, autonomousWorker: true, feedbackAfterClose: true, realExamStatus: 'draft' }));
    }
  } else if (mode === 'cleanup') {
    for (const result of await service.collection('course_exam_results').getFullList({ filter: service.filter('attempt = {:id}', { id: fixture.attempt }) })) await service.collection('course_exam_results').delete(result.id);
    for (const row of [...fixture.created].reverse()) await service.collection(row.collection).delete(row.id);
    assert.equal(hash(await target()), fixture.targetHash);
    await unlink(path); console.log('Fixture y credenciales eliminados; primer parcial real intacto en borrador.');
  } else throw new Error('Usá begin, check o cleanup.');
}
}
await verify();
