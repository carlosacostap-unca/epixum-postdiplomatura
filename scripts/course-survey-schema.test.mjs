import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCourseSurveySchema, surveyRules } from './course-survey-schema.mjs';
import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

function fixture(batch = { enabled: true, maxRequests: 100 }) {
  const records = new Map([['courses', { id: 'courses', fields: [{ name: 'title', type: 'text' }, { name: 'contentsEnabled', type: 'bool' }], viewRule: 'preserved' }], ['users', { id: 'users', fields: [] }]]);
  return {
    records,
    settings: { getAll: async () => ({ batch }) },
    collections: {
      getOne: async name => { if (!records.has(name)) throw { status: 404 }; return structuredClone(records.get(name)); },
      create: async data => { const value = { id: data.name, ...data }; records.set(data.name, value); return structuredClone(value); },
      update: async (id, patch) => { const value = { ...records.get(id), ...patch }; records.set(id, value); return structuredClone(value); },
    },
  };
}
test('esquema privado e idempotente que conserva campos y reglas no modificadas', async () => {
  const pb = fixture();
  await applyCourseSurveySchema(pb);
  const first = JSON.stringify([...pb.records]);
  await applyCourseSurveySchema(pb);
  assert.equal(JSON.stringify([...pb.records]), first);
  const courses = pb.records.get('courses');
  assert.equal(courses.viewRule, 'preserved');
  assert.equal(courses.updateRule, COURSE_UPDATE_RULE);
  assert.equal(courses.fields.filter(f => f.name === 'surveysEnabled').length, 1);
  assert.ok(courses.fields.some(f => f.name === 'contentsEnabled'));
  assert.match(COURSE_UPDATE_RULE, /@request.body.surveysEnabled:isset = false/);
  for (const name of ['course_surveys', 'course_survey_participations', 'course_survey_responses', 'course_survey_revisions', 'course_survey_openings']) {
    const record = pb.records.get(name);
    for (const rule of Object.keys(surveyRules)) assert.equal(record[rule], null, `${name}.${rule}`);
  }
  assert.match(pb.records.get('course_survey_participations').indexes[0], /UNIQUE.*\(survey, student\)/);
  assert.match(pb.records.get('course_survey_revisions').indexes[0], /UNIQUE.*\(survey, revision\)/);
  for (const name of ['course_survey_responses', 'course_survey_participations', 'course_survey_revisions']) assert.ok(!pb.records.get(name).fields.some(f => f.type === 'autodate'));
  assert.equal(pb.records.get('course_survey_responses').fields.find(f => f.name === 'student').required, undefined);
  assert.equal(pb.records.get('course_survey_responses').fields.find(f => f.name === 'opening').cascadeDelete, false);
});
test('rechaza instalaciones sin lotes transaccionales antes de modificar el esquema', async () => {
  const pb = fixture({ enabled: false, maxRequests: 100 });
  await assert.rejects(applyCourseSurveySchema(pb), /batch/);
  assert.equal(pb.records.size, 2);
});
