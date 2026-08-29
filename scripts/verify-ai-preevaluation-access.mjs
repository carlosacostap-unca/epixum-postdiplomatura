import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

dotenv.config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
const superEmail = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
const superPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
if (!url || !superEmail || !superPassword) throw new Error('Faltan las credenciales de PocketBase en .env.local');

const suffix = randomUUID().slice(0, 8);
const password = `Epixum-${randomUUID()}!`;
const created = [];
const superPb = new PocketBase(url);
superPb.autoCancellation(false);
function client() { const pb = new PocketBase(url); pb.autoCancellation(false); return pb; }
async function fixture(collection, data) { const record = await superPb.collection(collection).create(data); created.push({ collection, id: record.id }); return record; }
async function expectDenied(operation, label) {
  try { await operation(); assert.fail(`${label}: la operación debió ser rechazada`); }
  catch (error) { if (error?.code === 'ERR_ASSERTION') throw error; assert.ok([400, 403, 404].includes(error?.status), `${label}: estado inesperado ${error?.status}`); }
}
async function createUser(role) {
  const email = `openspec-ai-${role}-${suffix}-${randomUUID().slice(0, 6)}@example.invalid`;
  const user = await fixture('users', { email, emailVisibility: false, verified: true, password, passwordConfirm: password, role, name: `Prueba ${role}` });
  const pb = client();
  await pb.collection('users').authWithPassword(email, password);
  return { pb, user };
}
async function cleanup() {
  for (const item of [...created].reverse()) {
    try { await superPb.collection(item.collection).delete(item.id); }
    catch (error) { if (error?.status !== 404) console.warn(`No se pudo limpiar ${item.collection}/${item.id}`); }
  }
}

try {
  await superPb.collection('_superusers').authWithPassword(superEmail, superPassword);
  const admin = await createUser('admin');
  const teacher = await createUser('docente');
  const outsider = await createUser('docente');
  const student = await createUser('estudiante');
  const anonymous = client();
  const course = await fixture('courses', { title: `IA ${suffix}`, description: '', status: 'en curso', aiPreevaluationEnabled: true, teachers: [teacher.user.id] });
  const assignment = await fixture('assignments', { title: 'TP IA', description: 'Resolver', course: course.id });
  const delivery = await fixture('deliveries', { assignment: assignment.id, student: student.user.id, repositoryUrl: JSON.stringify({ type: 'url', url: 'https://github.com/epixum/tp' }) });
  const configData = { assignment: assignment.id, active: true, criteria: [{ id: 'c1', title: 'Código', description: 'Calidad' }], requiredChecks: [], allowedVerdicts: ['Aprobado'], gradeEnabled: false, gradeMin: null, gradeMax: null, messageGuidance: '', additionalInstructions: '', version: 1 };
  const config = await teacher.pb.collection('assignment_ai_configs').create(configData);
  created.push({ collection: 'assignment_ai_configs', id: config.id });
  assert.equal((await admin.pb.collection('assignment_ai_configs').getOne(config.id)).id, config.id);
  assert.equal((await teacher.pb.collection('assignment_ai_configs').getOne(config.id)).id, config.id);
  await expectDenied(() => outsider.pb.collection('assignment_ai_configs').getOne(config.id), 'docente ajeno no lee configuración');
  await expectDenied(() => student.pb.collection('assignment_ai_configs').getOne(config.id), 'estudiante no lee configuración');
  await expectDenied(() => anonymous.collection('assignment_ai_configs').getOne(config.id), 'anónimo no lee configuración');

  const attempt = await fixture('ai_preevaluations', { course: course.id, assignment: assignment.id, delivery: delivery.id, requestedBy: teacher.user.id, status: 'processing', commitSha: 'a'.repeat(40), model: 'gpt-5.6-luna', configVersion: 1, configSnapshot: configData });
  assert.equal((await admin.pb.collection('ai_preevaluations').getOne(attempt.id)).id, attempt.id);
  assert.equal((await teacher.pb.collection('ai_preevaluations').getOne(attempt.id)).id, attempt.id);
  await expectDenied(() => outsider.pb.collection('ai_preevaluations').getOne(attempt.id), 'docente ajeno no lee intento');
  await expectDenied(() => student.pb.collection('ai_preevaluations').getOne(attempt.id), 'estudiante no lee intento');
  await expectDenied(() => anonymous.collection('ai_preevaluations').getOne(attempt.id), 'anónimo no lee intento');
  await expectDenied(() => teacher.pb.collection('ai_preevaluations').update(attempt.id, { status: 'completed' }), 'docente no altera intento directamente');
  await expectDenied(() => admin.pb.collection('ai_preevaluations').create({ ...attempt, id: undefined }), 'admin de aplicación no crea intento directamente');
  process.stdout.write('Verificación IA superada: admin/docente asignado leen, actores ajenos no acceden y los intentos solo se escriben con servicio.\n');
} catch (error) {
  process.stderr.write(`Verificación IA fallida (${error?.status || 'sin estado'}): ${error?.response?.message || error?.message || error}\n`);
  process.exitCode = 1;
} finally {
  await cleanup();
}
