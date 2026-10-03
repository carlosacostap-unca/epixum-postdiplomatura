import assert from 'node:assert/strict';
import test from 'node:test';
import { applyInteractiveClassSchema, INTERACTIVE_LESSON_RULES } from './interactive-class-schema.mjs';
import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

function fakeClient() {
  const state = new Map([
    ['courses', { id: 'courses', fields: [{ id: 'existing', name: 'title', type: 'text' }], indexes: ['CREATE INDEX legacy ON courses (title)'] }],
    ['classes', { id: 'classes', fields: [] }],
  ]);
  const pb = { collections: {
    async getOne(name) { if (!state.has(name)) throw { status: 404 }; return structuredClone(state.get(name)); },
    async create(data) { state.set(data.name, { ...structuredClone(data), id: data.name }); return state.get(data.name); },
    async update(id, data) { state.set(id, { ...state.get(id), ...structuredClone(data) }); return state.get(id); },
  } };
  return { pb, state };
}

test('migración aditiva repetible: conserva campos e índices, no escribe registros', async () => {
  const { pb, state } = fakeClient();
  await applyInteractiveClassSchema(pb);
  const snapshot = structuredClone(state);
  await applyInteractiveClassSchema(pb);
  assert.deepEqual(state, snapshot);
  assert.equal(state.get('courses').fields.find((field) => field.name === 'title').id, 'existing');
  assert.equal(state.get('courses').indexes.length, 1);
  const fields = state.get('interactive_lessons').fields;
  assert.equal(fields.find((field) => field.name === 'class').cascadeDelete, false);
  assert.equal(fields.find((field) => field.name === 'material').maxSize, 200000);
  assert.equal(state.get('interactive_lessons').indexes.length, 2);
});

test('la privacidad requiere docente asignado y curso habilitado; el curso es inmutable', () => {
  for (const rule of Object.values(INTERACTIVE_LESSON_RULES)) {
    assert.match(rule, /course\.teachers\.id/);
    assert.match(rule, /course\.interactiveClassesEnabled = true/);
    assert.doesNotMatch(rule, /course_enrollments|role = "docente"/);
  }
  assert.match(INTERACTIVE_LESSON_RULES.updateRule, /@request.body.course:changed = false/);
  assert.match(INTERACTIVE_LESSON_RULES.updateRule, /@collection.classes.course \?= course/);
  assert.match(COURSE_UPDATE_RULE, /@request.body.interactiveClassesEnabled:isset = false/);
});

test('un fallo de lectura distinto de 404 no crea una colección de reemplazo', async () => {
  const { pb } = fakeClient();
  const original = pb.collections.getOne;
  pb.collections.getOne = async (name) => { if (name === 'interactive_lessons') throw { status: 500 }; return original(name); };
  await assert.rejects(applyInteractiveClassSchema(pb), (error) => error.status === 500);
});
