import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyInvitationSchema,
  ATTEMPT_RULES,
  COURSE_UPDATE_RULE,
  ENROLLMENT_RULES,
  INVITATION_RULES,
} from './invitation-schema.mjs';
import { CONTENT_RULES, INQUIRY_RULES, WEEK_RULES } from './weekly-schema.mjs';

function fakePocketBase() {
  const operations = [];
  const collections = new Map([
    ['users', { id: 'users-id', name: 'users', fields: [{ name: 'email', type: 'email' }], indexes: [] }],
    ['courses', { id: 'courses-id', name: 'courses', fields: [{ name: 'title', type: 'text' }, { name: 'enrollmentKeyHash', type: 'text', hidden: true }], indexes: [], updateRule: 'legacy' }],
    ['course_enrollments', { id: 'enrollments-id', name: 'course_enrollments', fields: [{ name: 'course', type: 'relation' }, { name: 'student', type: 'relation' }, { name: 'keyHash', type: 'text', hidden: true }], indexes: ['CREATE UNIQUE INDEX idx_course_enrollments_unique ON course_enrollments (course, student)'] }],
  ]);
  const records = {
    courses: [
      { id: 'course-1', title: 'Existente', enrollmentKeyHash: 'a'.repeat(64) },
      { id: 'course-2', title: 'Configurado', enrollmentMode: 'invitacion_contrasena' },
    ],
    course_enrollments: [{ id: 'enrollment-1', course: 'course-1', student: 'student-1' }],
  };
  let nextId = 1;

  const pb = {
    collections: {
      async getOne(name) {
        const value = collections.get(name);
        if (!value) throw Object.assign(new Error('not found'), { status: 404 });
        return structuredClone(value);
      },
      async create(data) {
        operations.push({ action: 'createCollection', name: data.name, updateRule: data.updateRule, indexes: data.indexes });
        const value = { id: `created-${nextId++}`, indexes: [], ...structuredClone(data) };
        collections.set(data.name, value);
        records[data.name] ||= [];
        return structuredClone(value);
      },
      async update(id, data) {
        const entry = [...collections.entries()].find(([, value]) => value.id === id);
        assert.ok(entry, `collection ${id} exists`);
        const [name, current] = entry;
        operations.push({ action: 'updateCollection', name, fields: data.fields?.map((field) => field.name), updateRule: data.updateRule, indexes: data.indexes });
        const updated = { ...current, ...structuredClone(data) };
        collections.set(name, updated);
        return structuredClone(updated);
      },
    },
    collection(name) {
      return {
        async getFullList() { return structuredClone(records[name] || []); },
        async update(id, data) {
          const record = records[name].find((candidate) => candidate.id === id);
          Object.assign(record, structuredClone(data));
          return structuredClone(record);
        },
      };
    },
  };
  return { pb, collections, records, operations };
}

test('crea el esquema de invitaciones sin alterar matrículas ni claves existentes', async () => {
  const { pb, collections, records } = fakePocketBase();
  const originalEnrollment = structuredClone(records.course_enrollments[0]);
  const originalKey = records.courses[0].enrollmentKeyHash;

  const result = await applyInvitationSchema(pb);

  assert.equal(result.initializedCourses, 1);
  assert.equal(records.courses[0].enrollmentMode, 'clave');
  assert.equal(records.courses[1].enrollmentMode, 'invitacion_contrasena');
  assert.equal(records.courses[0].enrollmentKeyHash, originalKey);
  assert.deepEqual(records.course_enrollments[0], originalEnrollment);
  assert.equal(collections.get('courses').updateRule, COURSE_UPDATE_RULE);
  assert.equal(collections.get('course_enrollment_invitations').listRule, INVITATION_RULES.listRule);
  assert.equal(collections.get('course_enrollment_attempts').createRule, ATTEMPT_RULES.createRule);
  assert.equal(collections.get('course_enrollments').createRule, ENROLLMENT_RULES.createRule);
  assert.ok(collections.get('course_enrollments').fields.some((field) => field.name === 'invitation'));
  assert.ok(!collections.get('course_enrollment_attempts').fields.some((field) => /password|hash/i.test(field.name)));
  assert.equal(collections.get('course_enrollment_invitations').fields.find((field) => field.name === 'created').type, 'autodate');
  assert.equal(collections.get('course_enrollment_attempts').fields.find((field) => field.name === 'created').type, 'autodate');
  assert.equal(collections.get('courses').fields.find((field) => field.name === 'invitationPasswordHash').hidden, true);
  assert.equal(collections.get('course_enrollments').fields.find((field) => field.name === 'keyHash').hidden, true);
});

test('la reejecución reconcilia reglas sin duplicar campos ni índices', async () => {
  const { pb, collections, records } = fakePocketBase();
  await applyInvitationSchema(pb);
  await applyInvitationSchema(pb);

  assert.equal(records.courses.filter((course) => course.enrollmentMode === 'clave').length, 1);
  assert.equal(collections.get('courses').fields.filter((field) => field.name === 'enrollmentMode').length, 1);
  assert.equal(collections.get('courses').fields.filter((field) => field.name === 'invitationPasswordHash').length, 1);
  assert.equal(collections.get('course_enrollment_invitations').indexes.filter((index) => index.includes('idx_course_invitation_email')).length, 1);
  assert.equal(collections.get('course_enrollment_attempts').indexes.filter((index) => index.includes('idx_course_invitation_attempts')).length, 1);
  assert.equal(collections.get('course_enrollment_attempts').fields.filter((field) => field.name === 'created').length, 1);
  assert.equal(collections.get('course_enrollments').fields.filter((field) => field.name === 'invitation').length, 1);
});

test('instala desde el inicio la regla administrativa de activación', async () => {
  const { pb, operations } = fakePocketBase();
  await applyInvitationSchema(pb);

  const invitationCreate = operations.findIndex((operation) => operation.action === 'createCollection' && operation.name === 'course_enrollment_invitations');
  assert.ok(invitationCreate >= 0);
  assert.equal(operations[invitationCreate].updateRule, INVITATION_RULES.updateRule);
});

test('agrega el índice temporal después de materializar el campo created', async () => {
  const { pb, operations } = fakePocketBase();
  await applyInvitationSchema(pb);

  const attemptsCreate = operations.findIndex((operation) => operation.action === 'createCollection' && operation.name === 'course_enrollment_attempts');
  const attemptsIndex = operations.findIndex((operation) => operation.action === 'updateCollection' && operation.name === 'course_enrollment_attempts' && operation.indexes?.some((index) => index.includes('idx_course_invitation_attempts')));
  assert.ok(attemptsCreate >= 0);
  assert.deepEqual(operations[attemptsCreate].indexes, []);
  assert.ok(attemptsIndex > attemptsCreate);
});

test('las reglas separan permisos de admin, docentes y estudiantes invitados', () => {
  assert.match(INVITATION_RULES.listRule, /@request\.auth\.role = "admin"/);
  assert.match(INVITATION_RULES.listRule, /emailNormalized:lower = @request\.auth\.email:lower/);
  assert.match(INVITATION_RULES.listRule, /status = "pendiente"/);
  assert.match(INVITATION_RULES.listRule, /course\.enrollmentMode = "invitacion_contrasena"/);
  assert.match(INVITATION_RULES.listRule, /course\.status != "borrador"/);
  assert.doesNotMatch(INVITATION_RULES.listRule, /docente/);
  assert.equal(INVITATION_RULES.createRule, '@request.auth.role = "admin"');
  assert.equal(INVITATION_RULES.updateRule, '@request.auth.role = "admin"');
  assert.equal(INVITATION_RULES.deleteRule, '@request.auth.role = "admin"');
});

test('una llamada directa no puede fabricar matrículas, usar invitaciones ajenas ni borrar intentos', () => {
  assert.equal(ENROLLMENT_RULES.createRule, null);
  assert.match(ATTEMPT_RULES.createRule, /student = @request\.auth\.id/);
  assert.match(ATTEMPT_RULES.createRule, /invitation\.course\.id = course\.id/);
  assert.equal(ATTEMPT_RULES.updateRule, null);
  assert.equal(ATTEMPT_RULES.deleteRule, '@request.auth.role = "admin"');
});

test('la doble validación mantiene la autorización semanal basada en matrículas', () => {
  for (const rule of [WEEK_RULES.listRule, CONTENT_RULES.listRule, INQUIRY_RULES.listRule]) {
    assert.match(rule, /course_enrollments_via_course\.student\.id/);
  }
});
