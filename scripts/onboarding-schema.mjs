import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

const dates = [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
];
// Responses are only accessed through the authorized server service. In
// particular, draft answers and email-change requests are not exposed via API.
export const onboardingRules = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
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
export async function applyOnboardingSchema(pb) {
  const courses = await pb.collections.getOne('courses');
  const users = await pb.collections.getOne('users');
  await ensure(pb, 'courses', [{ name: 'onboardingEnabled', type: 'bool' }], { updateRule: COURSE_UPDATE_RULE });
  const scope = [
    { name: 'course', type: 'relation', required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
    { name: 'student', type: 'relation', required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: true },
  ];
  await ensure(pb, 'course_onboarding', [...scope,
    { name: 'profileConfirmedAt', type: 'date' },
    { name: 'surveyDraft', type: 'json', maxSize: 16000 },
    { name: 'emailChangeRequested', type: 'email' },
    { name: 'requirementsAcceptedAt', type: 'date' },
    { name: 'requirementsVersion', type: 'number', onlyInt: true, min: 0 },
    { name: 'completedAt', type: 'date' }, ...dates,
  ], onboardingRules, ['CREATE UNIQUE INDEX idx_onboarding_student ON course_onboarding (course, student)']);
  await ensure(pb, 'course_onboarding_surveys', [...scope,
    { name: 'answers', type: 'json', required: true, maxSize: 16000 },
    { name: 'version', type: 'number', required: true, onlyInt: true, min: 1 }, ...dates,
  ], onboardingRules, ['CREATE UNIQUE INDEX idx_onboarding_survey_student ON course_onboarding_surveys (course, student)']);
}
