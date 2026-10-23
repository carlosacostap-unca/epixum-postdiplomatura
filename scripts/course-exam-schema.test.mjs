import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCourseExamSchema } from './course-exam-schema.mjs';
function fixture() {
  const collections = new Map([
    ['courses', { id: 'courses', name: 'courses', fields: [{ name: 'title', type: 'text' }], indexes: [], listRule: 'existing course rule' }],
    ['users', { id: 'users', name: 'users', fields: [], indexes: [] }],
  ]);
  return { collections, pb: { collections: {
    getOne: async name => { if (!collections.has(name)) throw { status: 404 }; return structuredClone(collections.get(name)); },
    create: async data => { const record = { ...data, id: data.name }; collections.set(data.name, record); return record; },
    update: async (id, data) => { const record = { ...collections.get(id), ...data }; collections.set(id, record); return record; },
  } } };
}
test('añade parciales sin alterar campos ni reglas ajenos; repetir no duplica campos o índices', async () => {
  const { pb, collections } = fixture();
  await applyCourseExamSchema(pb); const once = structuredClone([...collections]);
  await applyCourseExamSchema(pb); assert.deepEqual([...collections], once);
  assert.equal(collections.get('courses').listRule, 'existing course rule');
  assert.ok(collections.get('courses').fields.some(f => f.name === 'title'));
  assert.ok(collections.get('courses').updateRule.includes('@request.body.examsEnabled:isset = false'));
});
test('protege claves y snapshots y garantiza intento, guardado y resultado únicos', async () => {
  const { pb, collections } = fixture(); await applyCourseExamSchema(pb);
  for (const name of ['course_exams', 'course_exam_attempts', 'course_exam_answers', 'course_exam_results']) {
    const collection = collections.get(name);
    for (const key of ['listRule','viewRule','createRule','updateRule','deleteRule']) assert.equal(collection[key], null);
    assert.ok(collection.fields.filter(f => f.type === 'relation').every(f => f.cascadeDelete === false));
  }
  assert.ok(collections.get('course_exam_attempts').indexes.some(i => i.includes('UNIQUE') && i.includes('(exam, student)')));
  assert.ok(collections.get('course_exam_attempts').fields.some(f => f.name === 'photoKey' && f.hidden === true && !f.required));
  assert.ok(collections.get('course_exam_answers').indexes.some(i => i.includes('UNIQUE') && i.includes('(attempt, mutationId)')));
  assert.ok(collections.get('course_exam_results').indexes.some(i => i.includes('UNIQUE') && i.includes('(attempt)')));
});
