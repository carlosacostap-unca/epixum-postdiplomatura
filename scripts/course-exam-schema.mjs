import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';
const dates = [{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false }, { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }];
const relation = (name, collectionId) => ({ name, type: 'relation', required: true, maxSelect: 1, cascadeDelete: false, collectionId });
const locked = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
async function ensure(pb, name, fields, indexes = [], rules = locked) {
  let previous;
  try { previous = await pb.collections.getOne(name); } catch (e) { if (e.status !== 404) throw e; }
  const merged = [...(previous?.fields || [])];
  for (const field of fields) { const i = merged.findIndex(f => f.name === field.name); if (i < 0) merged.push(field); else merged[i] = { ...merged[i], ...field }; }
  const data = { fields: merged, indexes: [...new Set([...(previous?.indexes || []), ...indexes])], ...rules };
  return previous ? pb.collections.update(previous.id, data) : pb.collections.create({ name, type: 'base', ...data });
}
export async function applyCourseExamSchema(pb) {
  const courses = await pb.collections.getOne('courses');
  const users = await pb.collections.getOne('users');
  await ensure(pb, 'courses', [{ name: 'examsEnabled', type: 'bool' }], [], { updateRule: COURSE_UPDATE_RULE });
  const scope = [relation('course', courses.id)];
  const title = { name: 'title', type: 'text', required: true, max: 160 };
  const exam = await ensure(pb, 'course_exams', [...scope, title, { name: 'description', type: 'text', max: 2000 }, { name: 'status', type: 'select', required: true, values: ['draft', 'published', 'archived'], maxSelect: 1 }, { name: 'opensAt', type: 'date' }, { name: 'closesAt', type: 'date' }, { name: 'questions', type: 'json', maxSize: 200000 }, ...dates], ['CREATE INDEX idx_course_exams_course ON course_exams (course, status)']);
  const ownership = [...scope, relation('exam', exam.id), relation('student', users.id)];
  const attempt = await ensure(pb, 'course_exam_attempts', [...ownership, title, { name: 'snapshot', type: 'json', required: true, maxSize: 200000 }, { name: 'deadline', type: 'date', required: true }, { name: 'cameraActive', type: 'bool' }, { name: 'cameraLastSeen', type: 'date' }, { name: 'photoKey', type: 'text', max: 240, hidden: true }, ...dates], ['CREATE UNIQUE INDEX idx_course_exam_student ON course_exam_attempts (exam, student)', 'CREATE INDEX idx_course_exam_deadline ON course_exam_attempts (deadline)']);
  await ensure(pb, 'course_exam_answers', [...scope, relation('student', users.id), relation('attempt', attempt.id), ...['questionId', 'optionId', 'mutationId'].map(name => ({ name, type: 'text', required: true, max: 64 })), ...dates], ['CREATE UNIQUE INDEX idx_course_exam_answer_mutation ON course_exam_answers (attempt, mutationId)', 'CREATE INDEX idx_course_exam_answer_attempt ON course_exam_answers (attempt, created)']);
  await ensure(pb, 'course_exam_results', [...ownership, relation('attempt', attempt.id), { name: 'finishedAt', type: 'date', required: true }, { name: 'reason', type: 'select', required: true, values: ['submitted', 'expired'], maxSelect: 1 }, ...['correct', 'total', 'percentage'].map(name => ({ name, type: 'number', min: 0, onlyInt: true })), { name: 'selected', type: 'json', maxSize: 20000 }, ...dates], ['CREATE UNIQUE INDEX idx_course_exam_result ON course_exam_results (attempt)']);
}
