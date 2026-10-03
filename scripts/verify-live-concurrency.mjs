import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { cleanupLiveFixture, createLiveFixture, pool, testAdmin } from './live-test-fixtures.mjs';

const origin = process.env.LIVE_TEST_ORIGIN || 'http://localhost:3002';
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error('La prueba de carga requiere un servidor local explícito.');
const admin = await testAdmin();
let fixture;
const streams = [];
const report = { date: new Date().toISOString(), participants: 100, environment: 'Next.js local + PocketBase configurado en .env.local', checks: {}, timingsMs: {} };
const api = async (actor, path, body) => {
  const response = await fetch(`${origin}${path}`, { method: body ? 'POST' : 'GET', headers: { Cookie: `pb_auth=${actor.token}`, Origin: origin, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${data.error}`);
  return data;
};
function connect(actor, id) {
  const abort = new AbortController();
  let readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const stream = { abort, ready, changedAt: 0 };
  streams.push(stream);
  const timeout = setTimeout(() => { readyReject(new Error('SSE no quedó listo en 45 s')); abort.abort(); }, 45_000);
  stream.done = (async () => {
    const response = await fetch(`${origin}/api/interactivas/sesiones/${id}/events`, { headers: { Cookie: `pb_auth=${actor.token}` }, signal: abort.signal });
    if (!response.ok) throw new Error(`SSE ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) >= 0) {
        const event = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        if (event.includes('event: ready')) { clearTimeout(timeout); readyResolve(); }
        if (event.includes('event: change')) stream.changedAt ||= performance.now();
      }
    }
  })().catch((error) => { if (!abort.signal.aborted) readyReject(error); }).finally(() => clearTimeout(timeout));
  return stream;
}
const timed = async (name, fn) => { const start = performance.now(); const value = await fn(); report.timingsMs[name] = Math.round(performance.now() - start); return value; };
try {
  console.log('Creando 100 cuentas y matrículas temporales…');
  fixture = await createLiveFixture(admin, 100);
  const { id } = await api(fixture.teacher, '/api/interactivas/iniciar', { courseId: fixture.course, lessonId: fixture.lesson });
  const path = `/api/interactivas/sesiones/${id}`;
  let state = await api(fixture.teacher, path);
  await timed('join100', () => pool(fixture.students, 20, (student) => api(student, '/api/interactivas/ingresar', { code: state.session.code })));
  console.log('Conectando 100 alumnos simultáneos por SSE…');
  await timed('connect100', () => pool(fixture.students, 100, (student) => connect(student, id).ready));
  const changed = performance.now();
  await api(fixture.teacher, path, { kind: 'screen', index: 1, revision: state.session.revision });
  const deadline = performance.now() + 15_000;
  while (streams.some((s) => !s.changedAt) && performance.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(streams.filter((s) => s.changedAt).length, 100, 'Todos reciben la notificación SSE');
  const latency = streams.map((s) => s.changedAt - changed).sort((a, b) => a - b);
  report.timingsMs.sseP95 = Math.round(latency[94]); report.timingsMs.sseMax = Math.round(latency[99]);
  state = await api(fixture.teacher, path);
  await api(fixture.teacher, path, { kind: 'activity', open: true, revision: state.session.revision });
  const snapshots = await timed('snapshot100', () => pool(fixture.students, 100, (student) => api(student, path)));
  assert.ok(snapshots.every((s) => s.role === 'student' && s.session.screenId === 'pregunta' && !JSON.stringify(s).includes('correctOptionId')));
  const command = { kind: 'answer', screenId: 'pregunta', revision: snapshots[0].session.revision, answer: 'a' };
  await timed('answer100', () => pool(fixture.students, 100, (student) => api(student, path, command)));
  await timed('retry100', () => pool(fixture.students, 100, (student) => api(student, path, command)));
  state = await api(fixture.teacher, path);
  assert.equal(state.participants.length, 100); assert.equal(state.answers.length, 100);
  assert.equal(new Set(state.answers.map((a) => a.student)).size, 100);
  await api(fixture.teacher, path, { kind: 'finish', revision: state.session.revision });
  const final = await api(fixture.students[0], path);
  assert.equal(final.session.status, 'closed'); assert.equal(final.ownAnswer.answer, 'a');
  report.checks = { sseNotifications: 100, participants: 100, persistedAnswers: 100, duplicateAnswers: 0, finalStateRecovered: true, solutionsPrivate: true };
  await mkdir('output/live-interactive', { recursive: true });
  await writeFile('output/live-interactive/concurrency.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const stream of streams) stream.abort.abort();
  await Promise.allSettled(streams.map((stream) => stream.done));
  if (fixture) await cleanupLiveFixture(admin, fixture);
  console.log('Conexiones cerradas y fixtures eliminados.');
}
