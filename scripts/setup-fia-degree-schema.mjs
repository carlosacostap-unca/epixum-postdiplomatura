import assert from 'node:assert/strict';
import { testAdmin } from './live-test-fixtures.mjs';

const pb = await testAdmin();
const collection = await pb.collections.getOne('course_enrollments');
const field = { name: 'fiaDegree', type: 'select', maxSelect: 1, values: ['tecnicatura', 'ingenieria', 'ambas'], hidden: true };
const existing = collection.fields.find(item => item.name === field.name);
if (existing) {
  for (const key of Object.keys(field)) assert.deepEqual(existing[key], field[key]);
} else {
  await pb.collections.update(collection.id, { fields: [...collection.fields, field] });
}
console.log('Campo de carrera verificado en matrículas.');
