import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

export const outcomeRules = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
async function ensure(pb, name, fields, rules, indexes = []) {
  let current;
  try { current = await pb.collections.getOne(name); } catch (error) { if (error.status !== 404) throw error; }
  const merged = [...(current?.fields || [])];
  for (const field of fields) {
    const i = merged.findIndex(item => item.name === field.name);
    if (i < 0) merged.push(field); else merged[i] = { ...merged[i], ...field };
  }
  const data = { fields: merged, ...rules, indexes: [...new Set([...(current?.indexes || []), ...indexes])] };
  return current ? pb.collections.update(current.id, data) : pb.collections.create({ name, type: 'base', ...data });
}
export async function applyCourseOutcomeSchema(pb) {
  const settings = await pb.settings.getAll();
  if (!settings.batch?.enabled || settings.batch.maxRequests < 2) throw new Error('Los resultados requieren batch habilitado con al menos dos operaciones.');
  const courses = await pb.collections.getOne('courses');
  const users = await pb.collections.getOne('users');
  await ensure(pb, 'courses', [{ name: 'outcomesEnabled', type: 'bool' }], { updateRule: COURSE_UPDATE_RULE });
  const outcomes = await ensure(pb, 'course_outcomes', [
    { name: 'course', type: 'relation', required: true, collectionId: courses.id, maxSelect: 1, cascadeDelete: true },
    // No relation to course_enrollments: removing enrollment preserves results.
    { name: 'student', type: 'relation', required: true, collectionId: users.id, maxSelect: 1, cascadeDelete: false },
    { name: 'draft', type: 'json', required: true, maxSize: 20000 },
    { name: 'published', type: 'json', maxSize: 20000 },
    { name: 'revision', type: 'text', required: true, max: 64 },
  ], outcomeRules, ['CREATE UNIQUE INDEX idx_outcome_student ON course_outcomes (course, student)']);
  await ensure(pb, 'course_outcome_history', [
    { name: 'outcome', type: 'relation', required: true, collectionId: outcomes.id, maxSelect: 1, cascadeDelete: true },
    { name: 'revision', type: 'text', required: true, max: 64 },
    { name: 'action', type: 'select', required: true, maxSelect: 1, values: ['save', 'publish', 'withdraw'] },
    { name: 'actor', type: 'relation', collectionId: users.id, maxSelect: 1, cascadeDelete: false },
    { name: 'actorName', type: 'text', required: true, max: 500 },
    { name: 'occurredAt', type: 'date', required: true },
    { name: 'snapshot', type: 'json', required: true, maxSize: 40000 },
  ], outcomeRules, ['CREATE UNIQUE INDEX idx_outcome_revision ON course_outcome_history (outcome, revision)']);
}
