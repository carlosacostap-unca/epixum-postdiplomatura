import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

export const surveyRules = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
async function ensure(pb, name, fields, rules, indexes = []) {
  let current;
  try { current = await pb.collections.getOne(name); } catch (error) { if (error.status !== 404) throw error; }
  const merged = [...(current?.fields || [])];
  for (const field of fields) {
    const index = merged.findIndex(item => item.name === field.name);
    if (index < 0) merged.push(field); else merged[index] = { ...merged[index], ...field };
  }
  const data = { fields: merged, ...rules, indexes: [...new Set([...(current?.indexes || []), ...indexes])] };
  return current ? pb.collections.update(current.id, data) : pb.collections.create({ name, type: 'base', ...data });
}
export async function applyCourseSurveySchema(pb) {
  const settings = await pb.settings.getAll();
  if (!settings.batch?.enabled || settings.batch.maxRequests < 4) throw new Error('Las encuestas requieren batch habilitado con al menos cuatro operaciones.');
  const courses = await pb.collections.getOne('courses');
  const users = await pb.collections.getOne('users');
  await ensure(pb, 'courses', [{ name: 'surveysEnabled', type: 'bool' }], { updateRule: COURSE_UPDATE_RULE });
  const surveys = await ensure(pb, 'course_surveys', [
    { name: 'course', type: 'relation', required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
    { name: 'title', type: 'text', required: true, max: 160 },
    { name: 'description', type: 'text', max: 3000 },
    { name: 'anonymous', type: 'bool' },
    { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['draft', 'published', 'closed'] },
    { name: 'closesAt', type: 'date' },
    { name: 'questions', type: 'json', required: true, maxSize: 200000 },
    { name: 'revision', type: 'text', required: true, max: 64 },
    { name: 'opening', type: 'text', max: 15 },
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
    { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
  ], surveyRules);
  const scope = { name: 'survey', type: 'relation', required: true, collectionId: surveys.id, maxSelect: 1, cascadeDelete: true };
  const openings = await ensure(pb, 'course_survey_openings', [scope], surveyRules,
    ['CREATE UNIQUE INDEX idx_survey_opening ON course_survey_openings (survey)']);
  // No dates or reference from participation to content: anonymous content stays separate.
  await ensure(pb, 'course_survey_participations', [scope,
    { name: 'student', type: 'relation', required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: false },
  ], surveyRules, ['CREATE UNIQUE INDEX idx_survey_participant ON course_survey_participations (survey, student)']);
  await ensure(pb, 'course_survey_responses', [scope,
    { name: 'opening', type: 'relation', collectionId: openings.id, maxSelect: 1, cascadeDelete: false },
    { name: 'student', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },
    { name: 'answers', type: 'json', required: true, maxSize: 200000 },
  ], surveyRules);
  await ensure(pb, 'course_survey_revisions', [scope,
    { name: 'revision', type: 'text', required: true, max: 64 },
  ], surveyRules, ['CREATE UNIQUE INDEX idx_survey_revision ON course_survey_revisions (survey, revision)']);
}
