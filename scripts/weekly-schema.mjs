import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

export { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

const WEEK_VISIBILITY_RULE =
  '(status = "publicada" || (status = "programada" && publishAt != "" && publishAt <= @now))';

export const WEEK_RULES = {
  listRule:
    `@request.auth.role = "admin" || course.teachers.id ?= @request.auth.id || (` +
    `course.course_enrollments_via_course.student.id ?= @request.auth.id && ${WEEK_VISIBILITY_RULE})`,
  viewRule:
    `@request.auth.role = "admin" || course.teachers.id ?= @request.auth.id || (` +
    `course.course_enrollments_via_course.student.id ?= @request.auth.id && ${WEEK_VISIBILITY_RULE})`,
  createRule:
    '(@request.auth.role = "admin" || course.teachers.id ?= @request.auth.id) && course.organizationMode = "semanal"',
  updateRule:
    '(@request.auth.role = "admin" || course.teachers.id ?= @request.auth.id) && course.organizationMode = "semanal"',
  deleteRule:
    '(@request.auth.role = "admin" || course.teachers.id ?= @request.auth.id) && course.organizationMode = "semanal"',
};

const CONTENT_VISIBILITY_RULE =
  '(course.organizationMode != "semanal" || (week != "" && ' +
  '(week.status = "publicada" || (week.status = "programada" && week.publishAt != "" && week.publishAt <= @now))))';

const CONTENT_SCOPE_RULE = '(week = "" || week.course.id = course.id)';

const CONTENT_READ_RULE =
  '@request.auth.role = "admin" || course.teachers.id ?= @request.auth.id || (' +
  'course.course_enrollments_via_course.student.id ?= @request.auth.id && ' + CONTENT_SCOPE_RULE + ' && ' + CONTENT_VISIBILITY_RULE + ')';

const CONTENT_MANAGE_RULE =
  '@request.auth.role = "admin" || course.teachers.id ?= @request.auth.id';

export const CONTENT_RULES = {
  listRule: CONTENT_READ_RULE,
  viewRule: CONTENT_READ_RULE,
  createRule: `(${CONTENT_MANAGE_RULE}) && ${CONTENT_SCOPE_RULE}`,
  updateRule: `(${CONTENT_MANAGE_RULE}) && ${CONTENT_SCOPE_RULE}`,
  deleteRule: CONTENT_MANAGE_RULE,
};

const INQUIRY_SCOPE_RULE =
  `${CONTENT_SCOPE_RULE} && (class = "" || class.course.id = course.id) && ` +
  '(assignment = "" || assignment.course.id = course.id) && ' +
  '(class = "" || class.week.id = week.id) && (assignment = "" || assignment.week.id = week.id)';

export const INQUIRY_RULES = {
  listRule: CONTENT_READ_RULE,
  viewRule: CONTENT_READ_RULE,
  createRule:
    `((${CONTENT_MANAGE_RULE}) && ${INQUIRY_SCOPE_RULE}) || (` +
    'author = @request.auth.id && ' +
    'course.course_enrollments_via_course.student.id ?= @request.auth.id && ' + INQUIRY_SCOPE_RULE + ' && ' + CONTENT_VISIBILITY_RULE + ')',
  updateRule:
    `((${CONTENT_MANAGE_RULE}) && ${INQUIRY_SCOPE_RULE}) || (` +
    'author = @request.auth.id && course.course_enrollments_via_course.student.id ?= @request.auth.id && ' + INQUIRY_SCOPE_RULE + ' && ' + CONTENT_VISIBILITY_RULE + ')',
  deleteRule:
    `${CONTENT_MANAGE_RULE} || (` +
    'author = @request.auth.id && course.course_enrollments_via_course.student.id ?= @request.auth.id && ' + CONTENT_VISIBILITY_RULE + ')',
};

const INQUIRY_READ_RULE =
  '@request.auth.role = "admin" || inquiry.course.teachers.id ?= @request.auth.id || (' +
  'inquiry.course.course_enrollments_via_course.student.id ?= @request.auth.id && ' +
  '(inquiry.course.organizationMode != "semanal" || (inquiry.week != "" && ' +
  '(inquiry.week.status = "publicada" || (inquiry.week.status = "programada" && inquiry.week.publishAt != "" && inquiry.week.publishAt <= @now)))))';

export const INQUIRY_RESPONSE_RULES = {
  listRule: INQUIRY_READ_RULE,
  viewRule: INQUIRY_READ_RULE,
  createRule: `author = @request.auth.id && (${INQUIRY_READ_RULE})`,
  updateRule: `author = @request.auth.id || @request.auth.role = "admin" || inquiry.course.teachers.id ?= @request.auth.id`,
  deleteRule: `author = @request.auth.id || @request.auth.role = "admin" || inquiry.course.teachers.id ?= @request.auth.id`,
};

export const DELIVERY_RULES = {
  listRule: '@request.auth.role = "admin" || student = @request.auth.id || assignment.course.teachers.id ?= @request.auth.id',
  viewRule: '@request.auth.role = "admin" || student = @request.auth.id || assignment.course.teachers.id ?= @request.auth.id',
  createRule: 'student = @request.auth.id && assignment.course.course_enrollments_via_course.student.id ?= @request.auth.id',
  updateRule:
    '@request.auth.role = "admin" || assignment.course.teachers.id ?= @request.auth.id || (' +
    'student = @request.auth.id && assignment.course.course_enrollments_via_course.student.id ?= @request.auth.id && ' +
    '@request.body.grade:isset = false && @request.body.feedback:isset = false && @request.body.verdict:isset = false && @request.body.status:isset = false)',
  deleteRule: null,
};

function hasField(collection, name) {
  return collection.fields.some((field) => field.name === name);
}

async function addField(pb, collection, field) {
  if (hasField(collection, field.name)) return collection;
  return pb.collections.update(collection.id, { fields: [...collection.fields, field] });
}

async function getCollection(pb, name) {
  try {
    return await pb.collections.getOne(name);
  } catch (error) {
    if (error?.status === 404) return null;
    throw error;
  }
}

async function ensureCourseMode(pb) {
  let courses = await pb.collections.getOne('courses');
  courses = await addField(pb, courses, {
    name: 'organizationMode',
    type: 'select',
    required: false,
    maxSelect: 1,
    values: ['tradicional', 'semanal'],
  });
  courses = await pb.collections.update(courses.id, { updateRule: COURSE_UPDATE_RULE });

  const records = await pb.collection('courses').getFullList({ fields: 'id,organizationMode' });
  let initialized = 0;
  for (const course of records) {
    if (course.organizationMode) continue;
    await pb.collection('courses').update(course.id, { organizationMode: 'tradicional' });
    initialized += 1;
  }
  return { courses, initialized };
}

function weekFields(coursesId) {
  return [
    { name: 'course', type: 'relation', required: true, collectionId: coursesId, cascadeDelete: true, maxSelect: 1 },
    // PocketBase interpreta `required` en números como "distinto de cero".
    // El campo sigue siendo no nulo (0 por defecto) y la aplicación valida su presencia.
    { name: 'number', type: 'number', required: false, min: 0, onlyInt: true },
    { name: 'title', type: 'text', required: true, min: 1, max: 160 },
    { name: 'startDate', type: 'date', required: false },
    { name: 'endDate', type: 'date', required: false },
    { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['borrador', 'publicada', 'programada'] },
    { name: 'publishAt', type: 'date', required: false },
  ];
}

async function ensureWeeksCollection(pb, courses) {
  let weeks = await getCollection(pb, 'course_weeks');
  const index = 'CREATE UNIQUE INDEX idx_course_weeks_number ON course_weeks (course, number)';
  if (!weeks) {
    return pb.collections.create({
      name: 'course_weeks',
      type: 'base',
      fields: weekFields(courses.id),
      indexes: [index],
      ...WEEK_RULES,
    });
  }

  const fields = [...weeks.fields];
  for (const field of weekFields(courses.id)) {
    const index = fields.findIndex((candidate) => candidate.name === field.name);
    if (index === -1) fields.push(field);
    else fields[index] = { ...fields[index], ...field };
  }
  const indexes = weeks.indexes?.some((candidate) => candidate.includes('idx_course_weeks_number'))
    ? weeks.indexes
    : [...(weeks.indexes || []), index];
  weeks = await pb.collections.update(weeks.id, { fields, indexes, ...WEEK_RULES });
  return weeks;
}

async function ensureWeekRelation(pb, collectionName, weeks, rules) {
  let collection = await pb.collections.getOne(collectionName);
  collection = await addField(pb, collection, {
    name: 'week',
    type: 'relation',
    required: false,
    collectionId: weeks.id,
    cascadeDelete: false,
    maxSelect: 1,
  });
  return pb.collections.update(collection.id, rules);
}

export async function applyWeeklySchema(pb) {
  const { courses, initialized } = await ensureCourseMode(pb);
  const weeks = await ensureWeeksCollection(pb, courses);
  await ensureWeekRelation(pb, 'classes', weeks, CONTENT_RULES);
  await ensureWeekRelation(pb, 'assignments', weeks, CONTENT_RULES);
  await ensureWeekRelation(pb, 'inquiries', weeks, INQUIRY_RULES);
  const responses = await getCollection(pb, 'inquiry_responses');
  if (responses) await pb.collections.update(responses.id, INQUIRY_RESPONSE_RULES);
  const deliveries = await getCollection(pb, 'deliveries');
  if (deliveries) await pb.collections.update(deliveries.id, DELIVERY_RULES);
  return { initializedCourses: initialized, weeksCollectionId: weeks.id };
}
