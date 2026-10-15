import assert from 'node:assert/strict';
import test from 'node:test';
import { applyLateSubmissionSchema } from './late-submission-schema.mjs';

function fixture() {
  const collections = {
    assignments: { id: 'assignments', name: 'assignments', fields: [{ name: 'dueDate', type: 'date', id: 'existing' }], listRule: 'lectura', updateRule: 'admin o docente', indexes: ['indice'] },
    deliveries: { id: 'deliveries', name: 'deliveries', fields: [{ name: 'history', type: 'json', maxSize: 1000000 }], createRule: null, updateRule: null, deleteRule: null, indexes: ['unico'] },
  };
  const writes = [];
  const pb = { collections: {
    async getOne(name) { return structuredClone(collections[name]); },
    async update(id, patch) { writes.push(id); Object.assign(collections[id], structuredClone(patch)); },
  }, collection() { throw new Error('No se deben leer ni modificar registros'); } };
  return { pb, collections, writes };
}
test('agrega sólo campos nuevos sin tocar reglas, índices ni registros', async () => {
  const { pb, collections } = fixture(); const before = structuredClone(collections);
  assert.deepEqual((await applyLateSubmissionSchema(pb)).added, ['assignments.allowLateSubmissions', 'deliveries.deadlineSnapshot']);
  for (const name of Object.keys(collections)) {
    assert.deepEqual({ ...collections[name], fields: before[name].fields }, before[name]);
    assert.deepEqual(collections[name].fields.slice(0, -1), before[name].fields);
  }
});
test('es idempotente sin reemplazar campos existentes', async () => {
  const { pb, collections, writes } = fixture(); await applyLateSubmissionSchema(pb); const before = structuredClone(collections);
  assert.deepEqual(await applyLateSubmissionSchema(pb), { added: [] });
  assert.deepEqual(collections, before); assert.equal(writes.length, 2);
});
test('rechaza campos incompatibles antes de modificar cualquier colección', async () => {
  const { pb, collections, writes } = fixture(); collections.deliveries.fields.push({ name: 'deadlineSnapshot', type: 'text' });
  await assert.rejects(() => applyLateSubmissionSchema(pb), /incompatible/); assert.equal(writes.length, 0);
});
test('no agrega snapshots manipulables desde escrituras directas de estudiantes', async () => {
  const { pb, collections, writes } = fixture(); collections.deliveries.updateRule = 'student = @request.auth.id';
  await assert.rejects(() => applyLateSubmissionSchema(pb), /restringidas al servidor/); assert.equal(writes.length, 0);
});
