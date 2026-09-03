import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCourseRoleRules, COURSE_ROLE_RULES } from './course-role-schema.mjs';

function fakePocketBase() {
  const state = new Map(Object.keys(COURSE_ROLE_RULES).map((name) => [name, { id: `${name}-id`, name }]));
  const recordWrites = [];
  const pb = {
    collections: {
      getOne: async (name) => state.get(name),
      update: async (id, patch) => {
        const name = id.replace(/-id$/, '');
        state.set(name, { ...state.get(name), ...patch });
        return state.get(name);
      },
    },
    collection: (name) => ({ create: (...args) => recordWrites.push([name, 'create', ...args]), update: (...args) => recordWrites.push([name, 'update', ...args]), delete: (...args) => recordWrites.push([name, 'delete', ...args]) }),
  };
  return { pb, recordWrites, state };
}

test('la migración de roles actualiza sólo reglas y es idempotente', async () => {
  const { pb, recordWrites, state } = fakePocketBase();
  const first = await applyCourseRoleRules(pb);
  const snapshot = JSON.stringify([...state]);
  const second = await applyCourseRoleRules(pb);
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify([...state]), snapshot);
  assert.deepEqual(recordWrites, []);
});
