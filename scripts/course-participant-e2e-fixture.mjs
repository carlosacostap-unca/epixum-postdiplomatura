import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !email || !password) throw new Error('Faltan credenciales de PocketBase');

const [operation, outputArgument = 'tmp/course-participant-e2e.json'] = process.argv.slice(2);
const outputPath = path.resolve(outputArgument);
const superPb = new PocketBase(url);
superPb.autoCancellation(false);
await superPb.collection('_superusers').authWithPassword(email, password);

if (operation === 'setup') {
  const suffix = randomUUID().slice(0, 8);
  const fixturePassword = `Epixum-${randomUUID()}!`;
  const created = [];
  const create = async (collection, data) => {
    const record = await superPb.collection(collection).create(data);
    created.push({ collection, id: record.id });
    return record;
  };
  try {
    const admin = await create('users', { email: `e2e-admin-${suffix}@example.invalid`, password: fixturePassword, passwordConfirm: fixturePassword, verified: true, role: 'admin', name: `E2E Admin ${suffix}` });
    const currentStudent = await create('users', { email: `e2e-current-student-${suffix}@example.invalid`, password: fixturePassword, passwordConfirm: fixturePassword, verified: true, role: 'docente', name: `E2E Alumno Actual ${suffix}` });
    const studentCandidate = await create('users', { email: `e2e-student-candidate-${suffix}@example.invalid`, password: fixturePassword, passwordConfirm: fixturePassword, verified: true, role: 'docente', name: `E2E Alumno Candidato ${suffix}` });
    const currentTeacher = await create('users', { email: `e2e-current-teacher-${suffix}@example.invalid`, password: fixturePassword, passwordConfirm: fixturePassword, verified: true, role: 'estudiante', name: `E2E Docente Actual ${suffix}` });
    const teacherCandidate = await create('users', { email: `e2e-teacher-candidate-${suffix}@example.invalid`, password: fixturePassword, passwordConfirm: fixturePassword, verified: true, role: 'estudiante', name: `E2E Docente Candidato ${suffix}` });
    const course = await create('courses', { title: `E2E Participantes ${suffix}`, description: '', status: 'borrador', organizationMode: 'tradicional', enrollmentMode: 'clave', teachers: [currentTeacher.id] });
    await create('course_enrollments', { course: course.id, student: currentStudent.id });
    const auth = await superPb.collection('users').authWithPassword(admin.email, fixturePassword);
    const state = { token: auth.token, suffix, courseId: course.id, studentCandidateId: studentCandidate.id, teacherCandidateId: teacherCandidate.id, created };
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(state)}\n`, { encoding: 'utf8', flag: 'wx' });
    process.stdout.write(`Fixture E2E creada para el curso ${course.id}.\n`);
  } catch (error) {
    for (const item of [...created].reverse()) {
      try { await superPb.collection(item.collection).delete(item.id); } catch { /* best effort */ }
    }
    throw error;
  }
} else if (operation === 'cleanup') {
  const state = JSON.parse(await readFile(outputPath, 'utf8'));
  for (const item of [...state.created].reverse()) {
    try { await superPb.collection(item.collection).delete(item.id); }
    catch (error) { if (error?.status !== 404) throw error; }
  }
  await unlink(outputPath);
  process.stdout.write('Fixture E2E eliminada.\n');
} else {
  throw new Error('Usá setup o cleanup');
}
