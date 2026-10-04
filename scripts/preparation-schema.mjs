import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';
export const preparationTeacherRule = '@request.auth.id != "" && course.preparationEnabled = true && course.teachers.id ?= @request.auth.id';
export const preparationResultRule = `@request.auth.id != "" && course.preparationEnabled = true && (course.teachers.id ?= @request.auth.id || (student = @request.auth.id && course.course_enrollments_via_course.student.id ?= @request.auth.id))`;
const dates = [{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false }, { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }];
const relation = (name, collectionId, cascadeDelete = true) => ({ name, type: 'relation', required: true, collectionId, maxSelect: 1, cascadeDelete });
const json = (name, maxSize = 200000) => ({ name, type: 'json', required: true, maxSize });
const title = { name: 'title', type: 'text', required: true, max: 160 };
async function ensure(pb, name, fields, rules, indexes = []) {
  let current;
  try { current = await pb.collections.getOne(name); } catch (e) { if (e.status !== 404) throw e; }
  const merged = [...(current?.fields || [])];
  for (const field of fields) { const index = merged.findIndex(f => f.name === field.name); if (index < 0) merged.push(field); else merged[index] = { ...merged[index], ...field }; }
  const data = { fields: merged, ...rules, indexes: [...new Set([...(current?.indexes || []), ...indexes])] };
  return current ? pb.collections.update(current.id, data) : pb.collections.create({ name, type: 'base', ...data });
}
export async function applyPreparationSchema(pb) {
  const courses = await pb.collections.getOne('courses'); const users = await pb.collections.getOne('users');
  await ensure(pb, 'courses', [{ name: 'preparationEnabled', type: 'bool', required: false }], { updateRule: COURSE_UPDATE_RULE });
  const scope = relation('course', courses.id);
  const quiz = await ensure(pb, 'practice_quizzes', [scope, title, { name: 'description', type: 'text', max: 2000 }, { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['draft', 'published', 'archived'] }, { ...json('questions'), required: false }, ...dates], {
    listRule: preparationTeacherRule, viewRule: preparationTeacherRule, createRule: preparationTeacherRule,
    updateRule: `${preparationTeacherRule} && @request.body.course:changed = false`, deleteRule: null,
  }, ['CREATE INDEX idx_practice_quizzes_course ON practice_quizzes (course, updated)']);
  const attempt = await ensure(pb, 'practice_attempts', [scope, relation('quiz', quiz.id, false), relation('student', users.id), title, json('snapshot'), ...dates], {
    listRule: preparationTeacherRule, viewRule: preparationTeacherRule, createRule: null, updateRule: null, deleteRule: null,
  }, ['CREATE INDEX idx_practice_attempts_student ON practice_attempts (course, student, created)']);
  await ensure(pb, 'practice_results', [scope, relation('attempt', attempt.id), relation('student', users.id), title,
    ...['correct', 'total', 'percentage'].map(name => ({ name, type: 'number', min: 0, onlyInt: true })), json('review', 400000), ...dates], {
    listRule: preparationResultRule, viewRule: preparationResultRule, createRule: null, updateRule: null, deleteRule: null,
  }, ['CREATE UNIQUE INDEX idx_practice_result_attempt ON practice_results (attempt)', 'CREATE INDEX idx_practice_results_course ON practice_results (course, created)']);
}
