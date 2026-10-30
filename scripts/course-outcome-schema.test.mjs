import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCourseOutcomeSchema, outcomeRules } from './course-outcome-schema.mjs';
import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

function fixture(batch = { enabled: true, maxRequests: 100 }) {
  const rows = new Map([['courses', { id: 'courses', fields: [{ name: 'surveysEnabled', type: 'bool' }], viewRule: 'unchanged' }], ['users', { id: 'users', fields: [] }]]);
  return { rows, settings: { getAll: async () => ({ batch }) }, collections: {
    getOne: async name => { if (!rows.has(name)) throw { status: 404 }; return structuredClone(rows.get(name)); },
    create: async data => { const value = { id: data.name, ...data }; rows.set(data.name, value); return structuredClone(value); },
    update: async (id, data) => { const value = { ...rows.get(id), ...data }; rows.set(id, value); return structuredClone(value); },
  } };
}
test('migración idempotente, privada y sin cascada desde matrícula o usuario', async () => {
  const pb = fixture(); await applyCourseOutcomeSchema(pb);
  const before = JSON.stringify([...pb.rows]); await applyCourseOutcomeSchema(pb);
  assert.equal(JSON.stringify([...pb.rows]), before);
  assert.equal(pb.rows.get('courses').viewRule, 'unchanged');
  assert.ok(pb.rows.get('courses').fields.some(f => f.name === 'surveysEnabled'));
  assert.equal(pb.rows.get('courses').fields.filter(f => f.name === 'outcomesEnabled').length, 1);
  assert.match(COURSE_UPDATE_RULE, /@request.body.outcomesEnabled:isset = false/);
  const outcomes = pb.rows.get('course_outcomes');
  assert.match(outcomes.indexes[0], /UNIQUE.*\(course, student\)/);
  assert.equal(outcomes.fields.find(f => f.name === 'student').cascadeDelete, false);
  assert.ok(!outcomes.fields.some(f => f.collectionId === 'course_enrollments'));
  assert.match(pb.rows.get('course_outcome_history').indexes[0], /UNIQUE.*\(outcome, revision\)/);
  for (const name of ['course_outcomes', 'course_outcome_history']) for (const key of Object.keys(outcomeRules)) assert.equal(pb.rows.get(name)[key], null);
});
test('no modifica el esquema si falta soporte transaccional', async () => {
  const pb = fixture({ enabled: false, maxRequests: 100 });
  await assert.rejects(applyCourseOutcomeSchema(pb), /batch/);
  assert.equal(pb.rows.size, 2);
});
test('un fallo de consulta distinto de 404 no crea colecciones de reemplazo', async () => {
  const pb = fixture(); pb.collections.getOne = async () => { throw { status: 500 }; };
  await assert.rejects(applyCourseOutcomeSchema(pb));
  assert.equal(pb.rows.size, 2);
});
