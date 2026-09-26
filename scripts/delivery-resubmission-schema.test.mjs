import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDeliveryResubmissionSchema,
  DELIVERY_WORKFLOW_RULES,
  legacyDeliveryWorkflowPatch,
} from './delivery-resubmission-schema.mjs';

function fakePocketBase() {
  const collection = {
    id: 'deliveries-id',
    name: 'deliveries',
    fields: [
      { name: 'assignment', type: 'relation' },
      { name: 'student', type: 'relation' },
      { name: 'repositoryUrl', type: 'text' },
      { name: 'status', type: 'select', values: ['pending', 'draft', 'published'] },
    ],
    indexes: ['CREATE UNIQUE INDEX idx_delivery_student ON deliveries (assignment, student)'],
    updateRule: 'student = @request.auth.id',
  };
  const records = [
    { id: 'pending', created: '2026-09-01T10:00:00.000Z', updated: '2026-09-01T10:00:00.000Z', status: '' },
    { id: 'published', created: '2026-09-01T10:00:00.000Z', updated: '2026-09-02T10:00:00.000Z', status: 'published' },
  ];
  const updates = [];
  const pb = {
    collections: {
      async getOne() { return structuredClone(collection); },
      async update(_id, data) { Object.assign(collection, structuredClone(data)); return structuredClone(collection); },
    },
    collection() {
      return {
        async getFullList() { return structuredClone(records); },
        async update(id, data) {
          updates.push({ id, data: structuredClone(data) });
          Object.assign(records.find((record) => record.id === id), structuredClone(data));
        },
      };
    },
  };
  return { pb, collection, records, updates };
}

test('agrega metadatos, endurece escrituras y conserva índices', async () => {
  const { pb, collection, records } = fakePocketBase();
  const result = await applyDeliveryResubmissionSchema(pb);
  assert.equal(result.migratedDeliveries, 2);
  assert.equal(collection.fields.find((field) => field.name === 'history').type, 'json');
  assert.equal(collection.fields.find((field) => field.name === 'submissionVersion').min, 1);
  assert.deepEqual(collection.indexes, ['CREATE UNIQUE INDEX idx_delivery_student ON deliveries (assignment, student)']);
  assert.equal(collection.updateRule, null);
  assert.equal(collection.createRule, null);
  assert.match(collection.viewRule, /assignment\.course\.teachers\.id/);
  assert.deepEqual(records[0].history, []);
  assert.equal(records[0].status, 'pending');
  assert.equal(records[1].evaluatedVersion, 1);
  assert.equal(records[1].evaluatedAt, '2026-09-02T10:00:00.000Z');
});

test('es idempotente y no vuelve a migrar registros versionados', async () => {
  const { pb, collection } = fakePocketBase();
  await applyDeliveryResubmissionSchema(pb);
  const result = await applyDeliveryResubmissionSchema(pb);
  assert.equal(result.migratedDeliveries, 0);
  assert.equal(collection.fields.filter((field) => field.name === 'history').length, 1);
});

test('el backfill conservador no infiere reenvíos históricos', () => {
  const patch = legacyDeliveryWorkflowPatch({
    created: '2026-09-01T10:00:00.000Z',
    updated: '2026-09-04T10:00:00.000Z',
    status: 'published',
    verdict: 'Corregir y reenviar',
    repositoryUrl: JSON.stringify({ captureSource: 'student-update' }),
  });
  assert.equal(patch.resubmissionCount, 0);
  assert.deepEqual(patch.history, []);
});

test('las reglas impiden falsificar el historial desde el cliente', () => {
  assert.equal(DELIVERY_WORKFLOW_RULES.createRule, null);
  assert.equal(DELIVERY_WORKFLOW_RULES.updateRule, null);
  assert.equal(DELIVERY_WORKFLOW_RULES.deleteRule, null);
  assert.match(DELIVERY_WORKFLOW_RULES.listRule, /student = @request\.auth\.id/);
});
