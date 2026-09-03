import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCourseContentSchema, COURSE_CONTENT_RULES, LINK_RULES } from './course-content-schema.mjs';
import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';
import { applyInvitationSchema } from './invitation-schema.mjs';
import { applyWeeklySchema } from './weekly-schema.mjs';

function createFakePocketBase() {
  const collections = new Map([
    ['users', { id: 'users-id', name: 'users', fields: [{ name: 'email', type: 'email' }], indexes: [] }],
    ['courses', { id: 'courses-id', name: 'courses', fields: [{ name: 'title', type: 'text' }], indexes: [], updateRule: 'legacy' }],
    ['course_enrollments', { id: 'enrollments-id', name: 'course_enrollments', fields: [{ name: 'course', type: 'relation' }, { name: 'student', type: 'relation' }], indexes: [] }],
    ['classes', { id: 'classes-id', name: 'classes', fields: [{ name: 'course', type: 'relation' }], indexes: [] }],
    ['assignments', { id: 'assignments-id', name: 'assignments', fields: [{ name: 'course', type: 'relation' }], indexes: [] }],
    ['inquiries', { id: 'inquiries-id', name: 'inquiries', fields: [{ name: 'course', type: 'relation' }], indexes: [] }],
    ['links', { id: 'links-id', name: 'links', fields: [{ name: 'class', type: 'relation' }, { name: 'assignment', type: 'relation' }], indexes: [], listRule: 'legacy' }],
  ]);
  const records = {
    courses: [{ id: 'course-1', title: 'Curso existente' }],
    course_enrollments: [{ id: 'enrollment-1', course: 'course-1', student: 'student-1' }],
    classes: [{ id: 'class-1', course: 'course-1' }],
    assignments: [{ id: 'assignment-1', course: 'course-1' }],
    inquiries: [{ id: 'inquiry-1', course: 'course-1' }],
    links: [{ id: 'link-1', class: 'class-1' }],
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
        const value = { id: `created-${nextId++}`, indexes: [], ...structuredClone(data) };
        collections.set(data.name, value);
        records[data.name] ||= [];
        return structuredClone(value);
      },
      async update(id, data) {
        const entry = [...collections.entries()].find(([, value]) => value.id === id);
        assert.ok(entry, `collection ${id} exists`);
        const [name, current] = entry;
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
          assert.ok(record, `record ${name}/${id} exists`);
          Object.assign(record, structuredClone(data));
          return structuredClone(record);
        },
      };
    },
  };

  return { pb, collections, records };
}

test('crea contenidos opcionales y conserva los datos existentes', async () => {
  const { pb, collections, records } = createFakePocketBase();
  const before = structuredClone(records);

  const result = await applyCourseContentSchema(pb);

  assert.equal(result.contentsCollectionId, collections.get('course_contents').id);
  assert.equal(collections.get('courses').fields.find((field) => field.name === 'contentsEnabled').type, 'bool');
  assert.equal(collections.get('courses').updateRule, COURSE_UPDATE_RULE);
  assert.equal(Boolean(records.courses[0].contentsEnabled), false);
  assert.ok(collections.get('course_contents').fields.some((field) => field.name === 'position'));
  assert.equal(collections.get('course_contents').listRule, COURSE_CONTENT_RULES.listRule);
  assert.equal(collections.get('links').fields.find((field) => field.name === 'content').collectionId, result.contentsCollectionId);
  assert.equal(collections.get('links').viewRule, LINK_RULES.viewRule);
  assert.deepEqual(records.links, before.links);
  assert.deepEqual(records.classes, before.classes);
  assert.deepEqual(records.assignments, before.assignments);
  assert.deepEqual(records.course_enrollments, before.course_enrollments);
});

test('la migración es idempotente y no duplica campos ni índices', async () => {
  const { pb, collections } = createFakePocketBase();
  await applyCourseContentSchema(pb);
  await applyCourseContentSchema(pb);

  assert.equal(collections.get('courses').fields.filter((field) => field.name === 'contentsEnabled').length, 1);
  assert.equal(collections.get('course_contents').indexes.filter((index) => index.includes('idx_course_contents_order')).length, 1);
  assert.equal(collections.get('links').fields.filter((field) => field.name === 'content').length, 1);
});

test('las migraciones conservan la regla protegida sin importar el orden', async () => {
  for (const order of [
    [applyCourseContentSchema, applyWeeklySchema, applyInvitationSchema],
    [applyInvitationSchema, applyWeeklySchema, applyCourseContentSchema],
  ]) {
    const { pb, collections } = createFakePocketBase();
    for (const apply of order) await apply(pb);
    assert.equal(collections.get('courses').updateRule, COURSE_UPDATE_RULE);
    assert.match(collections.get('courses').updateRule, /@request\.body\.contentsEnabled:isset = false/);
  }
});

test('las reglas exigen curso habilitado, alcance y un único padre de recurso', () => {
  assert.match(COURSE_CONTENT_RULES.createRule, /course\.teachers\.id/);
  assert.match(COURSE_CONTENT_RULES.createRule, /course\.contentsEnabled = true/);
  assert.match(COURSE_CONTENT_RULES.createRule, /@request\.auth\.role = "admin"/);
  assert.doesNotMatch(COURSE_CONTENT_RULES.createRule, /role = "docente"/);
  assert.match(COURSE_CONTENT_RULES.listRule, /course_enrollments_via_course\.student\.id/);
  assert.match(LINK_RULES.createRule, /class != "" && assignment = "" && content = ""/);
  assert.match(LINK_RULES.createRule, /content\.course\.contentsEnabled = true/);
  assert.match(LINK_RULES.viewRule, /content\.course\.course_enrollments_via_course\.student\.id/);
  assert.match(LINK_RULES.viewRule, /class\.week\.status = "publicada"/);
  assert.match(LINK_RULES.viewRule, /assignment\.week\.status = "publicada"/);
});
