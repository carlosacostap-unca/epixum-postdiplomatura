import assert from 'node:assert/strict';
import test from 'node:test';
import { applyReviewAppointmentsSchema } from './review-appointments-schema.mjs';

function fixture() {
  const state = new Map([
    ['courses', { id: 'courses', fields: [{ id: 'old-title', name: 'title', type: 'text' }], indexes: ['CREATE INDEX old_course_title ON courses (title)'] }],
    ['users', { id: 'users', fields: [] }],
  ]);
  let settings = { batch: { enabled: false, maxRequests: 50, timeout: 8, maxBodySize: 5000000 } };
  const pb = {
    collections: {
      async getOne(name) { if (!state.has(name)) throw { status: 404 }; return structuredClone(state.get(name)); },
      async create(data) { const value = { ...structuredClone(data), id: data.name }; state.set(data.name, value); return value; },
      async update(id, data) { const value = { ...state.get(id), ...structuredClone(data) }; state.set(id, value); return value; },
    },
    settings: { async getAll() { return structuredClone(settings); }, async update(data) { settings = structuredClone(data); } },
  };
  return { pb, state };
}
test('migración repetible sin escrituras de registros ni pérdida de campos, índices o ajustes', async () => {
  const { pb, state } = fixture();
  await applyReviewAppointmentsSchema(pb);
  const snapshot = structuredClone(state);
  await applyReviewAppointmentsSchema(pb);
  assert.deepEqual(state, snapshot);
  assert.equal(state.get('courses').fields.find(f => f.name === 'title').id, 'old-title');
  assert.deepEqual(state.get('courses').indexes, ['CREATE INDEX old_course_title ON courses (title)']);
  assert.deepEqual((await pb.settings.getAll()).batch, { enabled: true, maxRequests: 200, timeout: 8, maxBodySize: 5000000 });
});
test('conserva un límite de lotes superior ya configurado', async () => {
  const { pb } = fixture();
  await pb.settings.update({ batch: { enabled: true, maxRequests: 300, timeout: 10 } });
  await applyReviewAppointmentsSchema(pb);
  assert.equal((await pb.settings.getAll()).batch.maxRequests, 300);
});
test('un error de lectura no crea colecciones de reemplazo', async () => {
  const { pb, state } = fixture(); const get = pb.collections.getOne;
  pb.collections.getOne = async name => { if (name === 'course_reviews') throw { status: 500 }; return get(name); };
  await assert.rejects(applyReviewAppointmentsSchema(pb), e => e.status === 500);
  assert.equal(state.has('course_reviews'), false);
});
