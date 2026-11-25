import { withSprintScope } from './weekly-schema.mjs';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';
import { draftVisibility } from './course-draft-schema.mjs';

dotenv.config({ path: '.env.local', quiet: true });
const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
await pb.collection('_superusers').authWithPassword(process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD);
const courses = await pb.collections.getOne('courses');
const assignments = await pb.collections.getOne('assignments');
const weeks = await pb.collections.getOne('course_weeks');
const has = (collection, name) => collection.fields.some(field => field.name === name);
const relation = (name, collectionId, required = false) => ({ name, type: 'relation', collectionId, maxSelect: 1, required, cascadeDelete: required });
if (!has(courses, 'sprintsEnabled')) {
  const updateRule = '(' + courses.updateRule + ') && (@request.auth.role = "admin" || @request.body.sprintsEnabled:isset = false)';
  await pb.collections.update(courses.id, { fields: [...courses.fields, { name: 'sprintsEnabled', type: 'bool' }], updateRule });
}
let modules;
try { modules = await pb.collections.getOne('course_modules'); }
catch (error) { if (error.status !== 404) throw error; }
if (!modules) {
  const manage = '(@request.auth.role = "admin" || course.teachers.id ?= @request.auth.id) && course.sprintsEnabled = true && course.organizationMode = "semanal"';
  const read = '(' + manage + ') || (' + draftVisibility('course.') + ' && course.sprintsEnabled = true && course.course_enrollments_via_course.student.id ?= @request.auth.id)';
  const scoped = '(' + manage + ') && (assignment = "" || assignment.course.id = course.id)';
  modules = await pb.collections.create({
    name: 'course_modules', type: 'base',
    fields: [relation('course', courses.id, true), { name: 'number', type: 'number', onlyInt: true, required: true, min: 1 }, { name: 'title', type: 'text', required: true, max: 160 }, relation('assignment', assignments.id)],
    indexes: ['CREATE UNIQUE INDEX idx_course_module_number ON course_modules(course, number)', "CREATE UNIQUE INDEX idx_course_module_assignment ON course_modules(assignment) WHERE assignment != ''"],
    listRule: read, viewRule: read, createRule: scoped, updateRule: scoped + ' && @request.body.course:changed = false', deleteRule: manage
  });
}
if (!has(weeks, 'module')) {
  const fields = [...weeks.fields, relation('module', modules.id)];
  await pb.collections.update(weeks.id, { fields, ...withSprintScope({ createRule: weeks.createRule, updateRule: weeks.updateRule }, fields) });
}
console.log('Estructura modular disponible.');
