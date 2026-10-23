import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';

const mode = process.argv[2];
const origin = new URL(process.argv[3] || 'https://epixum.com');
assert.ok(['https://epixum.com', 'http://127.0.0.1:3107'].includes(origin.origin));
const path = 'tmp/assessments/course-exam-grading-fixture.json';
const service = await testAdmin();
const targetHash = async () => createHash('sha256').update(JSON.stringify(await service.collection('course_exams').getOne('dspfirstexam001'))).digest('hex');
const request = async (route, token) => {
  const response = await fetch(new URL(route, origin), { headers: { Cookie: `pb_auth=${token}`, 'Cache-Control': 'no-cache' }, redirect: 'manual', signal: AbortSignal.timeout(25000) });
  return { status: response.status, html: await response.text() };
};
const cases = [{ person: 'failed', correct: 7, label: 'Desaprobado' }, { person: 'regularize', correct: 8, label: 'En condiciones de regularizar' }, { person: 'promote', correct: 14, label: 'En condiciones de promocionar' }];
if (mode === 'begin') {
  try { await readFile(path); throw new Error('Ya existe un fixture; usá check o cleanup.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = { created: [], tokens: {}, people: {}, attempts: {}, course: '', exam: '', targetHash: await targetHash() };
  const create = async (collection, data) => { const record = await service.collection(collection).create(data); fixture.created.push({ collection, id: record.id }); return record; };
  try {
    for (const person of ['admin', 'teacher', ...cases.map(c => c.person)]) {
      const password = `GradeQA-${randomUUID()}!`;
      const record = await create('users', { name: `Calificación Temporal ${person}`, email: `grade-${randomUUID()}@example.invalid`, role: person === 'admin' ? 'admin' : 'estudiante', password, passwordConfirm: password, verified: true });
      const client = new PocketBase(service.baseURL); await client.collection('users').authWithPassword(record.email, password); fixture.people[person] = record.id; fixture.tokens[person] = client.authStore.token;
    }
    fixture.course = (await create('courses', { title: `Calificación temporal ${randomUUID()}`, status: 'en curso', examsEnabled: true, teachers: [fixture.people.teacher] })).id;
    for (const { person } of cases) await create('course_enrollments', { course: fixture.course, student: fixture.people[person] });
    const questions = Array.from({ length: 20 }, (_, i) => ({ id: `q${i}`, prompt: `Pregunta temporal ${i + 1}`, options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'b', explanation: 'Explicación temporal.' }));
    const input = { title: 'Parcial temporal de calificación', description: '', status: 'published', opensAt: new Date(Date.now() - 7200000).toISOString(), closesAt: new Date(Date.now() - 3600000).toISOString(), questions };
    fixture.exam = (await create('course_exams', { ...input, course: fixture.course })).id;
    for (const { person, correct } of cases) {
      const student = fixture.people[person];
      const attempt = await create('course_exam_attempts', { course: fixture.course, exam: fixture.exam, student, title: input.title, snapshot: input, deadline: input.closesAt, cameraActive: false }); fixture.attempts[person] = attempt.id;
      await create('course_exam_results', { course: fixture.course, exam: fixture.exam, student, attempt: attempt.id, finishedAt: input.closesAt, reason: 'submitted', correct, total: 20, percentage: correct * 5, selected: Object.fromEntries(questions.map((q, i) => [q.id, i < correct ? 'b' : 'a'])) });
    }
    const early = { ...input, title: 'Entrega anticipada temporal', opensAt: new Date(Date.now() - 60000).toISOString(), closesAt: new Date(Date.now() + 86400000).toISOString() };
    const earlyExam = await create('course_exams', { ...early, course: fixture.course });
    const earlyAttempt = await create('course_exam_attempts', { course: fixture.course, exam: earlyExam.id, student: fixture.people.promote, title: early.title, snapshot: early, deadline: early.closesAt, cameraActive: false }); fixture.earlyAttempt = earlyAttempt.id;
    await create('course_exam_results', { course: fixture.course, exam: earlyExam.id, student: fixture.people.promote, attempt: earlyAttempt.id, finishedAt: new Date().toISOString(), reason: 'submitted', correct: 14, total: 20, percentage: 70, selected: Object.fromEntries(questions.map((q, i) => [q.id, i < 14 ? 'b' : 'a'])) });
    await mkdir('tmp/assessments', { recursive: true }); await writeFile(path, JSON.stringify(fixture), { flag: 'wx' }); console.log('Casos sintéticos 3,5 / 4 / 7 preparados; parcial real intacto.');
  } catch (error) { await cleanupLiveFixture(service, fixture); throw error; }
} else {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  if (mode === 'cleanup') {
    await cleanupLiveFixture(service, fixture); assert.equal(await targetHash(), fixture.targetHash); await unlink(path); console.log('Casos sintéticos y credenciales eliminados; parcial real intacto.');
  } else if (mode === 'check') {
    const first = await request(`/estudiantes/cursos/${fixture.course}/parciales/intentos/${fixture.attempts.regularize}`, fixture.tokens.regularize);
    if (first.status !== 200 || !first.html.includes('En condiciones de regularizar')) { console.log(JSON.stringify({ ready: false, status: first.status })); process.exitCode = 2; }
    else {
      for (const { person, label } of cases) {
        const student = await request(`/estudiantes/cursos/${fixture.course}/parciales/intentos/${fixture.attempts[person]}`, fixture.tokens[person]);
        assert.equal(student.status, 200); assert.ok(student.html.includes(label)); assert.ok(!student.html.includes('Regularizado')); assert.ok(!student.html.includes('Promocionado'));
        const overview = await request(`/estudiantes/cursos/${fixture.course}/parciales`, fixture.tokens[person]); assert.equal(overview.status, 200); assert.ok(overview.html.includes(label)); assert.ok(!overview.html.includes('(Buenos Aires)'));
      }
      for (const person of ['teacher', 'admin']) {
        const base = person === 'teacher' ? `/docentes/cursos/${fixture.course}` : `/admin/courses/${fixture.course}`;
        const roster = await request(`${base}/parciales/${fixture.exam}/resultados`, fixture.tokens[person]); assert.equal(roster.status, 200);
        for (const { label } of cases) assert.ok(roster.html.includes(label));
      }
      for (const { person, label } of cases) {
        const detail = await request(`/docentes/cursos/${fixture.course}/estudiantes/${fixture.people[person]}`, fixture.tokens.teacher); assert.equal(detail.status, 200); assert.ok(detail.html.includes(label));
      }
      const early = await request(`/estudiantes/cursos/${fixture.course}/parciales/intentos/${fixture.earlyAttempt}`, fixture.tokens.promote);
      assert.equal(early.status, 200); assert.ok(early.html.includes('La nota y la devolución completa estarán disponibles a partir del cierre')); assert.ok(!early.html.includes('Nota:')); assert.ok(!early.html.includes('En condiciones de promocionar')); assert.ok(!early.html.includes('Condición del parcial'));
      assert.equal(await targetHash(), fixture.targetHash);
      console.log(JSON.stringify({ ready: true, failedBelow4: true, regularizeFrom4: true, promoteFrom7: true, studentFeedback: true, teacherAndAdminRosters: true, studentHistory: true, earlyOutcomeHidden: true, realExamUnchanged: true }));
    }
  } else throw new Error('Usá begin, check o cleanup.');
}
