import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCourseGameSchema, gamePrivateRules } from './course-game-schema.mjs';
function fixture(enabled = true) {
  const rows = new Map([['courses', { id: 'courses', fields: [], viewRule: 'keep' }], ['users', { id: 'users', fields: ['firstName','lastName','dni','phone','birthDate'].map(name => ({ name })), viewRule: 'keep' }]]);
  return { rows, settings: { getAll: async () => ({ batch: { enabled, maxRequests: 2 } }) }, collections: {
    getOne: async name => { if (!rows.has(name)) throw { status: 404 }; return structuredClone(rows.get(name)); },
    create: async data => { const row = { id: data.name, ...data }; rows.set(data.name, row); return row; },
    update: async (id, data) => { const row = { ...rows.get(id), ...data }; rows.set(id, row); return row; },
  } };
}
test('esquema idempotente, privado y con índices para evitar duplicados concurrentes', async () => {
  const pb = fixture(); await applyCourseGameSchema(pb); const first = JSON.stringify([...pb.rows]);
  await applyCourseGameSchema(pb); assert.equal(JSON.stringify([...pb.rows]), first);
  assert.equal(pb.rows.get('users').viewRule, 'keep'); assert.equal(pb.rows.get('courses').viewRule, 'keep');
  for (const name of ['course_game_onboarding','course_game_tour_steps']) for (const key of Object.keys(gamePrivateRules)) assert.equal(pb.rows.get(name)[key], null);
  assert.match(pb.rows.get('course_game_onboarding').indexes[0], /UNIQUE.*\(course, student\)/);
  assert.match(pb.rows.get('course_game_tour_steps').indexes[0], /UNIQUE.*\(onboarding, version, step\)/);
});
test('rechaza ausencia de batch antes de modificar el esquema', async () => {
  const pb = fixture(false); await assert.rejects(applyCourseGameSchema(pb), /batch/); assert.equal(pb.rows.size, 2);
});
