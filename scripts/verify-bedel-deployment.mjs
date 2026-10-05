import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import PocketBase from 'pocketbase';
import { testAdmin, cleanupLiveFixture } from './live-test-fixtures.mjs';

// Explicit URL: this checks the deployed app using only temporary, isolated data.
const origin = new URL(process.argv[2] || '');
if (origin.protocol !== 'https:' || origin.pathname !== '/') throw new Error('Indicá el origen HTTPS del campus.');
const admin = await testAdmin();
const fixture = { created: [] };
const marker = `Bedel QA ${randomUUID().slice(0, 8)}`;
const create = async (collection, data) => {
  const record = await admin.collection(collection).create(data);
  fixture.created.push({ collection, id: record.id }); return record;
};
const user = async (role) => {
  const password = `Bedel-${randomUUID()}!`;
  const record = await create('users', { email: `${randomUUID()}@example.invalid`, name: `${marker} ${role}`, role, verified: true, password, passwordConfirm: password });
  const pb = new PocketBase(admin.baseURL); await pb.collection('users').authWithPassword(record.email, password);
  return { record, pb };
};
const request = async (path, pb) => {
  const response = await fetch(new URL(path, origin), { headers: { Cookie: `pb_auth=${pb.authStore.token}`, 'Cache-Control': 'no-cache' }, redirect: 'manual', signal: AbortSignal.timeout(20000) });
  return { status: response.status, html: await response.text(), location: response.headers.get('location') };
};

try {
  const bedel = await user('estudiante'); const student = await user('estudiante'); const manager = await user('admin');
  const course = await create('courses', { title: marker, status: 'borrador', interactiveClassesEnabled: true, attendanceEnabled: true });
  const other = await create('courses', { title: `Ajeno ${marker}`, status: 'borrador' });
  const assignment = await create('course_bedels', { course: course.id, email: bedel.record.email, firstName: 'Bedel', lastName: 'Temporal' });
  const cls = await create('classes', { course: course.id, title: `Contenido ${marker}`, description: '<p>Material de prueba de solo lectura.</p>' });
  await create('interactive_lessons', { course: course.id, class: cls.id, title: `Material ${marker}`, status: 'ready', material: { version: 1, screens: [{ id: 'one', type: 'content', title: 'Pantalla de prueba', body: 'Texto de prueba' }] } });
  await create('course_enrollments', { course: course.id, student: student.record.id });

  const deadline = Date.now() + 10 * 60_000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const response = await request('/bedeles', bedel.pb);
      if (response.status === 200 && response.html.includes(marker)) { ready = true; break; }
      console.log(`Esperando despliegue de Bedelía: HTTP ${response.status}.`);
    } catch { console.log('Esperando disponibilidad del campus.'); }
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  assert.ok(ready, 'La versión publicada no incorporó Bedelía dentro del plazo de verificación.');
  const home = await request('/', bedel.pb);
  assert.equal(home.location, '/bedeles', 'El ingreso debe dirigir al espacio de Bedelía.');
  const content = await request(`/bedeles/cursos/${course.id}`, bedel.pb);
  assert.equal(content.status, 200); assert.ok(content.html.includes(`Contenido ${marker}`));
  const attendance = await request(`/bedeles/cursos/${course.id}/asistencias`, bedel.pb);
  assert.equal(attendance.status, 200); assert.ok(attendance.html.includes('Planilla de asistencia'));
  assert.ok(!attendance.html.includes('>Corregir</button>'));
  assert.ok(!attendance.html.includes('>Desactivar asistencia</span>'));
  const management = await request(`/admin/courses/${course.id}/bedels`, manager.pb);
  assert.equal(management.status, 200); assert.ok(management.html.includes('Asignar bedel')); assert.ok(management.html.includes(bedel.record.email));
  const denied = await request(`/bedeles/cursos/${other.id}`, bedel.pb);
  assert.ok(!denied.html.includes(`Ajeno ${marker}`));
  await admin.collection('course_bedels').delete(assignment.id);
  const revoked = await request(`/bedeles/cursos/${course.id}`, bedel.pb);
  assert.ok(!revoked.html.includes(`Contenido ${marker}`));
  console.log(JSON.stringify({ origin: origin.origin, bedelDashboard: true, content: true, attendanceReadOnly: true, adminAssignment: true, otherCourseDenied: true, revokedAccessDenied: true }));
} catch (error) {
  console.error('Verificación de despliegue no completada:', error.message);
  process.exitCode = 1;
} finally {
  await cleanupLiveFixture(admin, fixture);
  console.log('Usuarios, cursos y asignaciones temporales eliminados.');
}
