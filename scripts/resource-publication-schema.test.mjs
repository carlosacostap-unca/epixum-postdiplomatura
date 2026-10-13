import assert from 'node:assert/strict';
import test from 'node:test';
import { applyResourcePublicationSchema } from './resource-publication-schema.mjs';
import { ASSIGNMENT_RULES, CLASS_RULES } from './weekly-schema.mjs';
import { LINK_RULES, COURSE_CONTENT_RULES } from './course-content-schema.mjs';

for (const locked of [true, false]) test(`migración idempotente conserva datos, campos e índices; entregas bloqueadas=${locked}`, async () => {
  const collections = new Map(['classes', 'course_contents', 'assignments', 'links', 'deliveries'].map(name => [name, {
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
  for (const name of ['links', 'classes', 'course_contents', 'assignments']) {
    const collection = collections.get(name);
    assert.equal(collection.fields.filter(f => f.name === 'publicationStatus').length, 1);
    assert.equal(collection.fields[0].id, 'existing');
    assert.deepEqual(collection.indexes, ['existing index']);
    if (name !== 'links') {
      assert.equal(collection.fields.filter(f => f.name === 'publishAt').length, 1);
      assert.ok(collection.fields.find(f => f.name === 'publicationStatus').values.includes('scheduled'));
    }
  }
  assert.equal(collections.get('assignments').viewRule, ASSIGNMENT_RULES.viewRule);
  assert.equal(collections.get('links').viewRule, LINK_RULES.viewRule);
  assert.equal(collections.get('classes').viewRule, CLASS_RULES.viewRule);
  assert.equal(collections.get('course_contents').viewRule, COURSE_CONTENT_RULES.viewRule);
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
  for (const rule of [CLASS_RULES.viewRule, ASSIGNMENT_RULES.viewRule, COURSE_CONTENT_RULES.viewRule]) {
    assert.match(rule, /publicationStatus = "scheduled" && publishAt != "" && publishAt <= @now/);
  }
  for (const parent of ['class', 'assignment', 'content']) {
    assert.ok(LINK_RULES.viewRule.includes(`${parent}.publishAt <= @now`));
  }
});

test('actualiza restricciones de entregas anteriores para aceptar programados vencidos', async () => {
  const collections = new Map(['classes', 'course_contents', 'assignments', 'links', 'deliveries'].map(name => [name, {
    id: name, fields: [], createRule: 'student = @request.auth.id && (assignment.publicationStatus = "" || assignment.publicationStatus = "published")', updateRule: null,
  }]));
  const pb = { collections: {
    getOne: async name => structuredClone(collections.get(name)),
    update: async (id, patch) => { collections.set(id, { ...collections.get(id), ...patch }); },
  } };
  await applyResourcePublicationSchema(pb);
  assert.match(collections.get('deliveries').createRule, /assignment.publishAt <= @now/);
  assert.equal(collections.get('deliveries').updateRule, null);
});
