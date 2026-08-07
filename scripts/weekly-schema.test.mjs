import assert from 'node:assert/strict';
import test from 'node:test';
import { applyWeeklySchema } from './weekly-schema.mjs';

function createFakePocketBase() {
  const collections = new Map([
    ['courses', { id: 'courses-id', name: 'courses', fields: [{ name: 'title', type: 'text' }], indexes: [], updateRule: 'legacy-course-update' }],
    ['classes', { id: 'classes-id', name: 'classes', fields: [{ name: 'course', type: 'relation' }], indexes: [], listRule: 'legacy-class-read' }],
    ['assignments', { id: 'assignments-id', name: 'assignments', fields: [{ name: 'course', type: 'relation' }], indexes: [], listRule: 'legacy-assignment-read' }],
    ['inquiries', { id: 'inquiries-id', name: 'inquiries', fields: [{ name: 'course', type: 'relation' }], indexes: [], listRule: 'legacy-inquiry-read' }],
  ]);
  const records = {
    courses: [{ id: 'course-1', title: 'Curso existente' }],
    classes: [{ id: 'class-1', course: 'course-1' }],
    assignments: [{ id: 'assignment-1', course: 'course-1' }],
    inquiries: [{ id: 'inquiry-1', course: 'course-1' }],
  };
  let nextCollection = 1;

  const pb = {
    collections: {
      async getOne(name) {
        const value = collections.get(name);
        if (!value) throw Object.assign(new Error('not found'), { status: 404 });
        return structuredClone(value);
      },
      async create(data) {
        const value = { id: `created-${nextCollection++}`, indexes: [], ...structuredClone(data) };
        collections.set(data.name, value);
        records[data.name] ||= [];
        return structuredClone(value);
      },
      async update(id, data) {
        const entry = [...collections.entries()].find(([, value]) => value.id === id);
        assert.ok(entry, `collection ${id} exists`);
        const [name, value] = entry;
        const updated = { ...value, ...structuredClone(data) };
        collections.set(name, updated);
        return structuredClone(updated);
      },
    },
    collection(name) {
      return {
        async getFullList() { return structuredClone(records[name]); },
        async update(id, data) {
          const item = records[name].find((candidate) => candidate.id === id);
          Object.assign(item, structuredClone(data));
          return structuredClone(item);
        },
      };
    },
  };
  return { pb, collections, records };
}

test('crea el esquema semanal, inicializa cursos y conserva contenido', async () => {
  const { pb, collections, records } = createFakePocketBase();
  const beforeCounts = Object.fromEntries(Object.entries(records).map(([name, items]) => [name, items.length]));

  const result = await applyWeeklySchema(pb);

  assert.equal(result.initializedCourses, 1);
  assert.equal(records.courses[0].organizationMode, 'tradicional');
  assert.ok(collections.get('courses').fields.some((field) => field.name === 'organizationMode'));
  assert.ok(collections.get('course_weeks'));
  assert.equal(collections.get('course_weeks').fields.find((field) => field.name === 'number').min, 0);
  assert.equal(collections.get('course_weeks').fields.find((field) => field.name === 'number').required, false);
  for (const name of ['classes', 'assignments', 'inquiries']) {
    assert.ok(collections.get(name).fields.some((field) => field.name === 'week'));
    assert.equal(records[name].length, beforeCounts[name]);
    assert.match(collections.get(name).listRule, /week\.course\.id = course\.id/);
  }
  assert.match(collections.get('inquiries').createRule, /class\.course\.id = course\.id/);
  assert.match(collections.get('inquiries').createRule, /assignment\.week\.id = week\.id/);
});

test('la reejecución es idempotente y no duplica campos ni índices', async () => {
  const { pb, collections } = createFakePocketBase();
  await applyWeeklySchema(pb);
  collections.get('course_weeks').fields.find((field) => field.name === 'number').min = 1;
  await applyWeeklySchema(pb);

  assert.equal(collections.get('courses').fields.filter((field) => field.name === 'organizationMode').length, 1);
  assert.equal(collections.get('course_weeks').indexes.filter((index) => index.includes('idx_course_weeks_number')).length, 1);
  assert.equal(collections.get('course_weeks').fields.find((field) => field.name === 'number').min, 0);
  assert.equal(collections.get('course_weeks').fields.find((field) => field.name === 'number').required, false);
  for (const name of ['classes', 'assignments', 'inquiries']) {
    assert.equal(collections.get(name).fields.filter((field) => field.name === 'week').length, 1);
  }
});
