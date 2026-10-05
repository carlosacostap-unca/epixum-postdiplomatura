import assert from 'node:assert/strict';
import test from 'node:test';
import { applyOnboardingSchema } from './onboarding-schema.mjs';

test('migración idempotente, índices únicos, datos privados y configuración solo administrativa', async () => {
  const state = new Map([['courses', { id: 'courses', fields: [{ id: 'existing', name: 'title', type: 'text' }], indexes: ['old_index'] }], ['users', { id: 'users', fields: [] }]]);
  const pb = { collections: {
    async getOne(name) { if (!state.has(name)) throw { status: 404 }; return structuredClone(state.get(name)); },
    async create(data) { const record = { id: data.name, ...data }; state.set(record.id, record); return record; },
    async update(id, data) { const record = { ...state.get(id), ...data }; state.set(id, record); return record; },
  } };
  await applyOnboardingSchema(pb);
  const before = structuredClone(state);
  await applyOnboardingSchema(pb);
  assert.deepEqual(state, before);
  assert.equal(state.get('courses').fields[0].id, 'existing');
  assert.deepEqual(state.get('courses').indexes, ['old_index']);
  assert.match(state.get('courses').updateRule, /onboardingEnabled:isset = false/);
  for (const name of ['course_onboarding', 'course_onboarding_surveys']) {
    const collection = state.get(name);
    for (const rule of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) assert.equal(collection[rule], null);
    assert.match(collection.indexes[0], /UNIQUE.*\(course, student\)/);
  }
});
