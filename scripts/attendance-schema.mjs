import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';
import { liveRules } from './live-interactive-schema.mjs';

export const attendanceRules = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
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

export async function applyAttendanceSchema(pb) {
  const [courses, classes, users] = await Promise.all(['courses', 'classes', 'users'].map(name => pb.collections.getOne(name)));
  // Fail before mutating anything if the live-class schema is not installed.
  await pb.collections.getOne('interactive_sessions');
  await pb.collections.getOne('course_enrollments');
  // Legacy enrollments have no creation timestamp. Preserve their membership;
  // future enrollments need a server timestamp to avoid retroactive absences.
  await ensure(pb, 'course_enrollments', [{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false }], {});
  await ensure(pb, 'courses', [{ name: 'attendanceEnabled', type: 'bool' }], { updateRule: COURSE_UPDATE_RULE });
  await ensure(pb, 'interactive_sessions', [{ name: 'attendanceEnabled', type: 'bool' }], liveRules.sessions);
  const relation = (name, collectionId, cascadeDelete = true) => ({ name, type: 'relation', collectionId, required: true, maxSelect: 1, cascadeDelete });
  await ensure(pb, 'course_attendance_adjustments', [
    relation('course', courses.id), relation('class', classes.id), relation('student', users.id),
    { ...relation('actor', users.id, false), required: false },
    { name: 'actorName', type: 'text', required: true, max: 300 },
    { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['present', 'absent'] },
    { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  ], attendanceRules, ['CREATE INDEX idx_attendance_adjustments ON course_attendance_adjustments (course, class, student, created)']);
}
