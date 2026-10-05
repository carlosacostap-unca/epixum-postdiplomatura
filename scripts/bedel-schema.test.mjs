import assert from 'node:assert/strict';
import test from 'node:test';
import { applyBedelSchema, BEDEL_RULES } from './bedel-schema.mjs';

test('migración aditiva, repetible y sin cambios en permisos o registros existentes', async () => {
  const courses = { id: 'courses', fields: [{ name: 'title', type: 'text' }], updateRule: 'original' };
  const state = new Map([['courses', structuredClone(courses)]]);
  const pb = { collections: {
    async getOne(name) { if (!state.has(name)) throw { status: 404 }; return structuredClone(state.get(name)); },
    async create(data) { const value = { ...data, id: data.name }; state.set(data.name, value); return value; },
    async update(id, data) { state.set(id, { ...state.get(id), ...data }); return state.get(id); },
  } };
  await applyBedelSchema(pb);
  const snapshot = structuredClone(state);
  await applyBedelSchema(pb);
  assert.deepEqual(state, snapshot);
  assert.deepEqual(state.get('courses'), courses);
  assert.match(state.get('course_bedels').indexes[0], /UNIQUE.*course, email COLLATE NOCASE/);
  assert.equal(state.get('course_bedels').fields.find(f => f.name === 'course').cascadeDelete, true);
});

test('solo administración escribe; la lectura propia requiere email verificado', () => {
  for (const name of ['createRule', 'updateRule', 'deleteRule']) assert.equal(BEDEL_RULES[name], '@request.auth.role = "admin"');
  for (const name of ['listRule', 'viewRule']) {
    assert.match(BEDEL_RULES[name], /@request.auth.verified = true/);
    assert.match(BEDEL_RULES[name], /email:lower = @request.auth.email:lower/);
  }
});

test('errores de conexión no disparan una creación de reemplazo', async () => {
  let created = false;
  const pb = { collections: {
    async getOne(name) { if (name === 'courses') return { id: 'courses' }; throw { status: 500 }; },
    async create() { created = true; },
  } };
  await assert.rejects(applyBedelSchema(pb), error => error.status === 500);
  assert.equal(created, false);
});
