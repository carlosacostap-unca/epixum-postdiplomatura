import assert from 'node:assert/strict';
import test from 'node:test';
import { applyAttendanceSchema } from './attendance-schema.mjs';
import { liveRules } from './live-interactive-schema.mjs';
test('migración aditiva e idempotente: flags protegidos y correcciones privadas', async () => {
  const state = new Map(['courses', 'classes', 'users', 'interactive_sessions', 'course_enrollments'].map(name => [name, { id: name, fields: [{ id: 'original', name: 'title', type: 'text' }], indexes: ['original_index'] }]));
  const pb = { collections: {
    async getOne(name) { if (!state.has(name)) throw { status: 404 }; return structuredClone(state.get(name)); },
    async create(data) { const record = { id: data.name, ...data }; state.set(record.id, record); return record; },
    async update(id, data) { const record = { ...state.get(id), ...data }; state.set(id, record); return record; },
  } };
  await applyAttendanceSchema(pb);
  const before = structuredClone(state);
  await applyAttendanceSchema(pb);
  assert.deepEqual(state, before);
  for (const name of ['courses', 'interactive_sessions']) {
    assert.equal(state.get(name).fields[0].id, 'original');
    assert.deepEqual(state.get(name).indexes, ['original_index']);
    assert.equal(state.get(name).fields.find(f => f.name === 'attendanceEnabled').type, 'bool');
  }
  assert.match(state.get('courses').updateRule, /attendanceEnabled:isset = false/);
  assert.deepEqual(state.get('course_enrollments').fields.find(f => f.name === 'created'), { name: 'created', type: 'autodate', onCreate: true, onUpdate: false });
  assert.match(state.get('interactive_sessions').createRule, /attendanceEnabled = course.attendanceEnabled/);
  assert.match(state.get('interactive_sessions').updateRule, /attendanceEnabled:changed = false/);
  for (const rule of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule']) assert.equal(state.get('course_attendance_adjustments')[rule], null);
});
test('la fuente automática solo permite ingresar en vivo y no permite modificar fecha ni identidad', () => {
  assert.match(liveRules.participants.createRule, /session.status = "live"/);
  assert.match(liveRules.participants.createRule, /created:isset = false/);
  assert.match(liveRules.participants.updateRule, /session:changed = false/);
  assert.match(liveRules.participants.updateRule, /student:changed = false/);
  assert.match(liveRules.participants.updateRule, /created:isset = false/);
});
