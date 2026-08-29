import assert from 'node:assert/strict';
import test from 'node:test';
import { applyAIPreevaluationSchema, AI_PREEVALUATION_RULES, ASSIGNMENT_AI_CONFIG_RULES } from './ai-preevaluation-schema.mjs';
import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

function fakePocketBase() {
  const collections = new Map([
    ['users', { id: 'users-id', name: 'users', fields: [], indexes: [] }],
    ['courses', { id: 'courses-id', name: 'courses', fields: [{ name: 'title', type: 'text' }], indexes: [], updateRule: 'legacy' }],
    ['assignments', { id: 'assignments-id', name: 'assignments', fields: [{ name: 'course', type: 'relation' }, { name: 'systemPrompt', type: 'text' }], indexes: [] }],
    ['deliveries', { id: 'deliveries-id', name: 'deliveries', fields: [{ name: 'assignment', type: 'relation' }, { name: 'grade', type: 'number' }], indexes: [] }],
  ]);
  const records = {
    users: [{ id: 'teacher-1', role: 'docente' }],
    courses: [{ id: 'course-1', title: 'Curso' }],
    assignments: [
      { id: 'assignment-1', course: 'course-1', systemPrompt: 'Revisar arquitectura.' },
      { id: 'assignment-2', course: 'course-1', systemPrompt: '' },
    ],
    deliveries: [{ id: 'delivery-1', assignment: 'assignment-1', grade: 8, feedback: 'Existente' }],
    assignment_ai_configs: [],
    ai_preevaluations: [],
  };
  let nextId = 1;
  const pb = {
    collections: {
      async getOne(name) {
        const collection = collections.get(name);
        if (!collection) throw Object.assign(new Error('not found'), { status: 404 });
        return structuredClone(collection);
      },
      async create(data) {
        const collection = { id: `collection-${nextId++}`, indexes: [], ...structuredClone(data) };
        collections.set(data.name, collection);
        records[data.name] ||= [];
        return structuredClone(collection);
      },
      async update(id, data) {
        const entry = [...collections.entries()].find(([, collection]) => collection.id === id);
        assert.ok(entry);
        const updated = { ...entry[1], ...structuredClone(data) };
        collections.set(entry[0], updated);
        return structuredClone(updated);
      },
    },
    collection(name) {
      return {
        async getFullList() { return structuredClone(records[name] || []); },
        async create(data) {
          const record = { id: `record-${nextId++}`, ...structuredClone(data) };
          records[name].push(record);
          return structuredClone(record);
        },
      };
    },
  };
  return { pb, collections, records };
}

test('crea el esquema, mantiene cursos deshabilitados y migra prompts como inactivos', async () => {
  const { pb, collections, records } = fakePocketBase();
  const deliveriesBefore = structuredClone(records.deliveries);
  const result = await applyAIPreevaluationSchema(pb);
  assert.equal(result.migratedPrompts, 1);
  assert.equal(collections.get('courses').fields.find((field) => field.name === 'aiPreevaluationEnabled').type, 'bool');
  assert.equal(Boolean(records.courses[0].aiPreevaluationEnabled), false);
  assert.equal(collections.get('courses').updateRule, COURSE_UPDATE_RULE);
  assert.deepEqual(records.deliveries, deliveriesBefore);
  assert.equal(records.assignment_ai_configs.length, 1);
  assert.equal(records.assignment_ai_configs[0].active, false);
  assert.equal(records.assignment_ai_configs[0].additionalInstructions, 'Revisar arquitectura.');
  assert.equal(records.assignment_ai_configs[0].version, 1);
  assert.equal(collections.get('assignment_ai_configs').fields.find((field) => field.name === 'assignment').cascadeDelete, true);
  assert.equal(collections.get('assignment_ai_configs').fields.find((field) => field.name === 'created').type, 'autodate');
  assert.equal(collections.get('ai_preevaluations').fields.find((field) => field.name === 'delivery').cascadeDelete, true);
  assert.equal(collections.get('ai_preevaluations').fields.find((field) => field.name === 'created').type, 'autodate');
});

test('es idempotente y no duplica campos, configuraciones ni índices', async () => {
  const { pb, collections, records } = fakePocketBase();
  await applyAIPreevaluationSchema(pb);
  await applyAIPreevaluationSchema(pb);
  assert.equal(collections.get('courses').fields.filter((field) => field.name === 'aiPreevaluationEnabled').length, 1);
  assert.equal(records.assignment_ai_configs.length, 1);
  assert.equal(collections.get('assignment_ai_configs').indexes.filter((index) => index.includes('idx_assignment_ai_configs_assignment')).length, 1);
  assert.equal(collections.get('ai_preevaluations').indexes.filter((index) => index.includes('idx_ai_preevaluations_processing')).length, 1);
});

test('las reglas mantienen configuración privada e intentos de solo escritura de servicio', () => {
  assert.match(ASSIGNMENT_AI_CONFIG_RULES.viewRule, /assignment\.course\.teachers\.id/);
  assert.match(ASSIGNMENT_AI_CONFIG_RULES.createRule, /aiPreevaluationEnabled = true/);
  assert.doesNotMatch(ASSIGNMENT_AI_CONFIG_RULES.viewRule, /estudiante/);
  assert.match(AI_PREEVALUATION_RULES.viewRule, /course\.teachers\.id/);
  assert.equal(AI_PREEVALUATION_RULES.createRule, null);
  assert.equal(AI_PREEVALUATION_RULES.updateRule, null);
  assert.match(COURSE_UPDATE_RULE, /aiPreevaluationEnabled:isset = false/);
});
