// Local verification script; requires Node with native TypeScript support.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import PocketBase from 'pocketbase';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';
import { encryptExamPhoto } from '../lib/exam-photo-crypto.ts';
import { syntheticExamPhoto } from './fixtures/synthetic-exam-photo.mjs';

const mode = process.argv[2];
const origin = new URL(process.argv[3] || 'https://epixum.com');
assert.ok(['https://epixum.com', 'http://127.0.0.1:3107'].includes(origin.origin));
const path = 'tmp/assessments/course-exam-photo-fixture.json';
const service = await testAdmin();
const storage = new S3Client({ endpoint: process.env.IDRIVE_ENDPOINT, region: process.env.IDRIVE_REGION || 'us-east-1', credentials: { accessKeyId: process.env.IDRIVE_ACCESS_KEY_ID, secretAccessKey: process.env.IDRIVE_SECRET_ACCESS_KEY }, forcePathStyle: true });
const bucket = process.env.IDRIVE_BUCKET_NAME;
const targetHash = async () => createHash('sha256').update(JSON.stringify(await service.collection('course_exams').getOne('dspfirstexam001'))).digest('hex');
const request = async (route, token) => fetch(new URL(route, origin), { headers: { ...(token ? { Cookie: `pb_auth=${token}` } : {}), 'Cache-Control': 'no-cache' }, redirect: 'manual', signal: AbortSignal.timeout(20000) });
const removePhoto = async fixture => { if (fixture.photoKey) await storage.send(new DeleteObjectCommand({ Bucket: bucket, Key: fixture.photoKey })); };
if (mode === 'begin') {
  try { await readFile(path); throw new Error('Ya existe un fixture; usá check o cleanup.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const fixture = { created: [], tokens: {}, people: {}, course: '', exam: '', attempt: '', photoKey: '', targetHash: await targetHash() };
  const create = async (collection, data) => { const record = await service.collection(collection).create(data); fixture.created.push({ collection, id: record.id }); return record; };
  try {
    for (const person of ['admin', 'teacher', 'student', 'other', 'outsider']) {
      const password = `PhotoQA-${randomUUID()}!`;
      const record = await create('users', { name: `Foto Temporal ${person}`, email: `photo-${randomUUID()}@example.invalid`, role: person === 'admin' ? 'admin' : 'estudiante', password, passwordConfirm: password, verified: true });
      const client = new PocketBase(service.baseURL); await client.collection('users').authWithPassword(record.email, password); fixture.people[person] = record.id; fixture.tokens[person] = client.authStore.token;
    }
    const course = await create('courses', { title: `Foto de parcial temporal ${randomUUID()}`, status: 'en curso', examsEnabled: true, teachers: [fixture.people.teacher] }); fixture.course = course.id;
    await create('courses', { title: `Otro curso temporal ${randomUUID()}`, status: 'en curso', teachers: [fixture.people.outsider] });
    for (const person of ['student', 'other']) await create('course_enrollments', { course: course.id, student: fixture.people[person] });
    const input = { title: 'Parcial temporal con foto', description: '', status: 'published', opensAt: new Date(Date.now() - 60000).toISOString(), closesAt: new Date(Date.now() + 86400000).toISOString(), questions: [{ id: 'q', prompt: 'Pregunta temporal', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], correctOptionId: 'b', explanation: 'Explicación temporal.' }] };
    fixture.exam = (await create('course_exams', { ...input, course: course.id })).id;
    fixture.startExam = (await create('course_exams', { ...input, title: 'Parcial temporal sin iniciar', course: course.id })).id;
    fixture.photoKey = `private/exam-photos/${course.id}/${fixture.people.student}/${randomUUID()}.enc`;
    const encrypted = encryptExamPhoto(syntheticExamPhoto, process.env.EXAM_PHOTO_ENCRYPTION_KEY || process.env.IDRIVE_SECRET_ACCESS_KEY);
    await storage.send(new PutObjectCommand({ Bucket: bucket, Key: fixture.photoKey, Body: encrypted, ContentType: 'application/octet-stream', CacheControl: 'no-store', ACL: 'private' }));
    fixture.attempt = (await create('course_exam_attempts', { course: course.id, exam: fixture.exam, student: fixture.people.student, title: input.title, snapshot: input, deadline: input.closesAt, cameraActive: false, photoKey: fixture.photoKey })).id;
    fixture.legacyAttempt = (await create('course_exam_attempts', { course: course.id, exam: fixture.exam, student: fixture.people.other, title: input.title, snapshot: input, deadline: input.closesAt, cameraActive: false })).id;
    await mkdir('tmp/assessments', { recursive: true }); await writeFile(path, JSON.stringify(fixture), { flag: 'wx' }); console.log('Fixture con foto sintética cifrada preparado; parcial real intacto.');
  } catch (error) { await cleanupLiveFixture(service, fixture); await removePhoto(fixture); throw error; }
} else {
  const fixture = JSON.parse(await readFile(path, 'utf8'));
  if (mode === 'cleanup') {
    await cleanupLiveFixture(service, fixture); await removePhoto(fixture); assert.equal(await targetHash(), fixture.targetHash); await unlink(path); console.log('Fixture, foto sintética y credenciales eliminados; parcial real intacto.');
  } else if (mode === 'check') {
    const photoPath = `/api/parciales/${fixture.course}/intentos/${fixture.attempt}/foto`;
    const ready = await request(photoPath, fixture.tokens.teacher);
    const start = await request(`/estudiantes/cursos/${fixture.course}/parciales/iniciar/${fixture.startExam}`, fixture.tokens.student);
    const startHtml = await start.text();
    if (ready.status !== 200 || start.status !== 200 || !startHtml.includes('El orden de las preguntas y sus opciones se mezcla al iniciar el intento')) { console.log(JSON.stringify({ ready: false, photoStatus: ready.status, startStatus: start.status, shuffleNotice: startHtml.includes('El orden de las preguntas y sus opciones se mezcla al iniciar el intento') })); process.exitCode = 2; }
    else {
      assert.deepEqual(Buffer.from(await ready.arrayBuffer()), syntheticExamPhoto); assert.ok(ready.headers.get('cache-control').includes('private, no-store'));
      for (const person of ['teacher', 'admin']) {
        const base = person === 'teacher' ? `/docentes/cursos/${fixture.course}` : `/admin/courses/${fixture.course}`;
        const detail = await request(`${base}/parciales/intentos/${fixture.attempt}`, fixture.tokens[person]); const html = await detail.text();
        assert.equal(detail.status, 200); assert.ok(html.includes('Ver foto inicial')); assert.ok(html.includes(photoPath)); assert.ok(!html.includes(fixture.photoKey));
        const photo = await request(photoPath, fixture.tokens[person]); assert.equal(photo.status, 200); assert.deepEqual(Buffer.from(await photo.arrayBuffer()), syntheticExamPhoto);
        const legacy = await request(`${base}/parciales/intentos/${fixture.legacyAttempt}`, fixture.tokens[person]); assert.ok((await legacy.text()).includes('Este intento comenzó sin una foto inicial registrada.'));
      }
      for (const person of ['student', 'other', 'outsider', 'anonymous']) { const denied = await request(photoPath, fixture.tokens[person]); assert.equal(denied.status, 404); assert.ok(!Buffer.from(await denied.arrayBuffer()).equals(syntheticExamPhoto)); }
      const student = await request(`/estudiantes/cursos/${fixture.course}/parciales/intentos/${fixture.attempt}`, fixture.tokens.student); const studentHtml = await student.text();
      assert.equal(student.status, 200); assert.ok(!studentHtml.includes(photoPath)); assert.ok(!studentHtml.includes(fixture.photoKey));
      const resume = await request(`/estudiantes/cursos/${fixture.course}/parciales/iniciar/${fixture.exam}`, fixture.tokens.student); assert.ok([200, 307].includes(resume.status));
      if (resume.status === 307) assert.ok(resume.headers.get('location').endsWith(`/intentos/${fixture.attempt}`)); else assert.ok((await resume.text()).includes(`/intentos/${fixture.attempt}`));
      assert.equal(await targetHash(), fixture.targetHash);
      console.log(JSON.stringify({ ready: true, privatePhoto: true, teacherAndAdminDetail: true, studentAndForeignTeacherDenied: true, legacyCompatible: true, resumeWithoutNewPhoto: true, realExamUnchanged: true }));
    }
  } else throw new Error('Usá begin, check o cleanup.');
}
