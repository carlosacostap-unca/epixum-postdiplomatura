import assert from 'node:assert/strict';
import test from 'node:test';
import { applyResourcePublicationSchema } from './resource-publication-schema.mjs';
import { ASSIGNMENT_RULES } from './weekly-schema.mjs';
import { LINK_RULES } from './course-content-schema.mjs';

for (const locked of [true, false]) test(`migración idempotente conserva datos, campos e índices; entregas bloqueadas=${locked}`, async () => {
  const collections = new Map(['assignments', 'links', 'deliveries'].map(name => [name, {
    id: name, name, fields: [{ name: 'title', type: 'text', id: 'existing' }], indexes: ['existing index'],
    createRule: locked ? null : 'student = @request.auth.id', updateRule: locked ? null : 'student = @request.auth.id',
  }]));
  const pb = { collections: {
    getOne: async name => structuredClone(collections.get(name)),
    update: async (id, patch) => { collections.set(id, { ...collections.get(id), ...patch }); return collections.get(id); },
  } };
  await applyResourcePublicationSchema(pb);
  const first = structuredClone([...collections]);
  await applyResourcePublicationSchema(pb);
  assert.deepEqual([...collections], first);
  for (const name of ['links', 'assignments']) {
    const collection = collections.get(name);
    assert.equal(collection.fields.filter(f => f.name === 'publicationStatus').length, 1);
    assert.equal(collection.fields[0].id, 'existing');
    assert.deepEqual(collection.indexes, ['existing index']);
  }
  assert.equal(collections.get('assignments').viewRule, ASSIGNMENT_RULES.viewRule);
  assert.equal(collections.get('links').viewRule, LINK_RULES.viewRule);
  if (locked) assert.equal(collections.get('deliveries').createRule, null);
  else assert.match(collections.get('deliveries').createRule, /assignment.publicationStatus/);
});

test('publicación se aplica a matrícula, sin quitar acceso docente ni visibilidad semanal', () => {
  assert.match(ASSIGNMENT_RULES.viewRule, /publicationStatus = ""/);
  assert.match(ASSIGNMENT_RULES.viewRule, /publicationStatus = "published"/);
  assert.match(ASSIGNMENT_RULES.viewRule, /week.status = "publicada"/);
  assert.match(LINK_RULES.viewRule, /assignment.publicationStatus/);
  assert.match(LINK_RULES.viewRule, /class.course.teachers/);
  assert.match(LINK_RULES.viewRule, /assignment.week.status/);
});
