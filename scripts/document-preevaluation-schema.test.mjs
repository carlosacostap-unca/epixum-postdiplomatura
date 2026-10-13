import assert from 'node:assert/strict';
import test from 'node:test';
import { documentPreevaluationSchemaPatch } from './document-preevaluation-schema.mjs';

test('migración documental idempotente y compatible con intentos GitHub', () => {
  const original = { fields: [{ id: 'sha', name: 'commitSha', type: 'text', required: true, min: 40, max: 40, pattern: '^[a-f0-9]{40}$' }, { id: 'custom', name: 'custom', type: 'json' }], indexes: ['legacy-index'], createRule: null };
  const first = documentPreevaluationSchemaPatch(original);
  const second = documentPreevaluationSchemaPatch({ ...original, ...first });
  assert.deepEqual(first, second);
  assert.equal(first.fields.find(f => f.name === 'commitSha').id, 'sha');
  assert.equal(first.fields.find(f => f.name === 'commitSha').required, false);
  assert.equal(first.fields.find(f => f.name === 'sourceDigest').max, 64);
  assert.equal(first.fields.find(f => f.name === 'custom').id, 'custom');
  assert.deepEqual(Object.keys(first), ['fields']);
  assert.equal(original.fields[0].required, true);
});
