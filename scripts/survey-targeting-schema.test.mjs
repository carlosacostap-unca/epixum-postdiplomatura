import assert from 'node:assert/strict';
import test from 'node:test';
import { applySurveyTargetingSchema, SURVEY_AUDIENCES } from './survey-targeting-schema.mjs';

test('agrega destinatarios de forma idempotente sin cambiar reglas ni escribir registros', async () => {
  let schema = { id: 'surveys', fields: [{ name: 'title', type: 'text' }], listRule: null, indexes: ['untouched'] };
  const pb = { collections: { getOne: async () => structuredClone(schema), update: async (_id, patch) => { schema = { ...schema, ...patch }; } } };
  await applySurveyTargetingSchema(pb); const first = structuredClone(schema);
  await applySurveyTargetingSchema(pb); assert.deepEqual(schema, first);
  assert.equal(schema.listRule, null); assert.deepEqual(schema.indexes, ['untouched']);
  const field = schema.fields.find(f => f.name === 'audience');
  assert.equal(field.required, false); assert.equal(field.maxSelect, 1); assert.deepEqual(field.values, SURVEY_AUDIENCES);
});
test('detiene la migración ante tipos incompatibles o errores de lectura', async () => {
  const pb = { collections: { getOne: async () => ({ fields: [{ name: 'audience', type: 'text' }] }), update: async () => { throw new Error('No debe escribir'); } } };
  await assert.rejects(applySurveyTargetingSchema(pb), /incompatible/);
  pb.collections.getOne = async () => { throw { status: 500 }; };
  await assert.rejects(applySurveyTargetingSchema(pb));
});
