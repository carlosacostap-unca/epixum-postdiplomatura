import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const hook = readFileSync(new URL('../pb_hooks/publish-ai-evaluation.pb.js', import.meta.url), 'utf8');
const result = { verdict: 'Aprobado', suggestedGrade: 8 };

function publish(change = () => {}) {
  const records = {
    deliveries: { id: 'delivery', assignment: 'tp', repositoryUrl: 'evidence', submissionVersion: 2, status: 'pending' },
    assignments: { id: 'tp', course: 'course' },
    courses: { id: 'course', aiPreevaluationEnabled: true },
    assignment_ai_configs: { id: 'config', active: true, autoPublish: true, version: 3 },
    ai_preevaluations: { id: 'attempt', delivery: 'delivery', assignment: 'tp', course: 'course', submissionVersion: 2, configVersion: 3, status: 'completed', result: JSON.stringify(result) },
  };
  change(records);
  const saved = [];
  const record = data => ({
    id: data.id, getBool: key => Boolean(data[key]), getInt: key => Number(data[key] || 0),
    getString: key => String(data[key] ?? ''), set: (key, value) => { data[key] = value; },
  });
  const tx = {
    findRecordById: (name, id) => { assert.equal(records[name].id, id); return record(records[name]); },
    findFirstRecordByFilter: name => record(records[name]), save: item => saved.push(item.id),
  };
  const event = {
    app: { runInTransaction: callback => callback(tx) },
    requestInfo: () => ({ body: { attemptId: 'attempt', deliveryId: 'delivery', version: 2, repositoryUrl: 'evidence', feedback: 'Buen trabajo.', grade: 8, verdict: 'Aprobado' } }),
    json: (_, value) => value,
  };
  vm.runInNewContext(hook, {
    $apis: { requireSuperuserAuth: () => 'superuser' },
    routerAdd: (method, path, handler, auth) => {
      assert.equal(method, 'POST');
      assert.equal(path, '/api/epixum/publish-ai-evaluation');
      assert.equal(auth, 'superuser');
      handler(event);
      handler(event);
    },
  });
  return { saved, records };
}

test('publica una sola vez y registra la adopción automática', () => {
  const { saved, records } = publish();
  assert.deepEqual(saved, ['delivery', 'attempt']);
  assert.equal(records.deliveries.evaluatedVersion, 2);
  assert.equal(records.deliveries.feedback, 'Buen trabajo.');
  assert.equal(records.deliveries.grade, 8);
  assert.equal(records.deliveries.status, 'published');
  assert.equal(records.ai_preevaluations.adoptedBy, '');
});

for (const [collection, field, value] of [
  ['courses', 'aiPreevaluationEnabled', false], ['assignment_ai_configs', 'active', false],
  ['assignment_ai_configs', 'autoPublish', false], ['assignment_ai_configs', 'version', 4],
  ['deliveries', 'status', 'draft'], ['deliveries', 'status', 'published'],
  ['deliveries', 'submissionVersion', 3], ['deliveries', 'repositoryUrl', 'replacement'],
  ['ai_preevaluations', 'status', 'failed'],
]) {
  test(`omite la publicación con ${collection}.${field} = ${value}`, () => {
    assert.deepEqual(publish(records => { records[collection][field] = value; }).saved, []);
  });
}
