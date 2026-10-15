import assert from 'node:assert/strict';
import test from 'node:test';
import { studentFeedbackSchemaPatch } from './ai-feedback-schema.mjs';

test('formato de devolución opcional e idempotente sin cambios de permisos o datos', () => {
  const collection = { fields: [{ id: 'existing', name: 'messageGuidance', type: 'text' }], indexes: ['existing'], listRule: 'private' };
  const first = studentFeedbackSchemaPatch(collection);
  const second = studentFeedbackSchemaPatch({ ...collection, ...first });
  assert.deepEqual(first, second);
  assert.equal(collection.fields.length, 1);
  assert.equal(first.fields[0].id, 'existing');
  assert.deepEqual(Object.keys(first), ['fields']);
  const field = first.fields.find(f => f.name === 'studentFeedbackMode');
  assert.equal(field.required, false);
  assert.deepEqual(field.values, ['full_report', 'message_only']);
});
