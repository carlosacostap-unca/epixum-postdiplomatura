import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

const weekVisibilityRule = (parent) =>
  `(${parent}.week.status = "publicada" || (${parent}.week.status = "programada" && ${parent}.week.publishAt != "" && ${parent}.week.publishAt <= @now))`;

const CLASS_STUDENT_READ =
  'class.course.course_enrollments_via_course.student.id ?= @request.auth.id && ' +
  `(class.course.organizationMode != "semanal" || (class.week != "" && ${weekVisibilityRule('class')}))`;

const ASSIGNMENT_STUDENT_READ =
  'assignment.course.course_enrollments_via_course.student.id ?= @request.auth.id && ' +
  `(assignment.course.organizationMode != "semanal" || (assignment.week != "" && ${weekVisibilityRule('assignment')}))`;

const CONTENT_STUDENT_READ =
  'content.course.contentsEnabled = true && content.course.course_enrollments_via_course.student.id ?= @request.auth.id';

const CLASS_READ =
  '(class != "" && (@request.auth.role = "admin" || class.course.teachers.id ?= @request.auth.id || ' +
  `(@request.auth.role = "estudiante" && ${CLASS_STUDENT_READ})))`;

const ASSIGNMENT_READ =
  '(assignment != "" && (@request.auth.role = "admin" || assignment.course.teachers.id ?= @request.auth.id || ' +
  `(@request.auth.role = "estudiante" && ${ASSIGNMENT_STUDENT_READ})))`;

const CONTENT_READ =
  '(content != "" && ((@request.auth.role = "docente" && content.course.teachers.id ?= @request.auth.id && content.course.contentsEnabled = true) || ' +
  `(@request.auth.role = "estudiante" && ${CONTENT_STUDENT_READ})))`;

const CLASS_MANAGE =
  '(class != "" && (@request.auth.role = "admin" || (@request.auth.role = "docente" && class.course.teachers.id ?= @request.auth.id)))';

const ASSIGNMENT_MANAGE =
  '(assignment != "" && (@request.auth.role = "admin" || (@request.auth.role = "docente" && assignment.course.teachers.id ?= @request.auth.id)))';

const CONTENT_MANAGE =
  '(content != "" && @request.auth.role = "docente" && content.course.teachers.id ?= @request.auth.id && content.course.contentsEnabled = true)';

const PARENT_EXCLUSIVE_RULE =
  '((class != "" && assignment = "" && content = "") || ' +
  '(class = "" && assignment != "" && content = "") || ' +
  '(class = "" && assignment = "" && content != ""))';

export const COURSE_CONTENT_RULES = {
  listRule:
    'course.contentsEnabled = true && ((@request.auth.role = "docente" && course.teachers.id ?= @request.auth.id) || ' +
    '(@request.auth.role = "estudiante" && course.course_enrollments_via_course.student.id ?= @request.auth.id))',
  viewRule:
    'course.contentsEnabled = true && ((@request.auth.role = "docente" && course.teachers.id ?= @request.auth.id) || ' +
    '(@request.auth.role = "estudiante" && course.course_enrollments_via_course.student.id ?= @request.auth.id))',
  createRule:
    '@request.auth.role = "docente" && course.teachers.id ?= @request.auth.id && course.contentsEnabled = true',
  updateRule:
    '@request.auth.role = "docente" && course.teachers.id ?= @request.auth.id && course.contentsEnabled = true',
  deleteRule:
    '@request.auth.role = "docente" && course.teachers.id ?= @request.auth.id && course.contentsEnabled = true',
};

export const LINK_RULES = {
  listRule: `${PARENT_EXCLUSIVE_RULE} && (${CLASS_READ} || ${ASSIGNMENT_READ} || ${CONTENT_READ})`,
  viewRule: `${PARENT_EXCLUSIVE_RULE} && (${CLASS_READ} || ${ASSIGNMENT_READ} || ${CONTENT_READ})`,
  createRule: `${PARENT_EXCLUSIVE_RULE} && (${CLASS_MANAGE} || ${ASSIGNMENT_MANAGE} || ${CONTENT_MANAGE})`,
  updateRule: `${PARENT_EXCLUSIVE_RULE} && (${CLASS_MANAGE} || ${ASSIGNMENT_MANAGE} || ${CONTENT_MANAGE})`,
  deleteRule: `${PARENT_EXCLUSIVE_RULE} && (${CLASS_MANAGE} || ${ASSIGNMENT_MANAGE} || ${CONTENT_MANAGE})`,
};

function isNotFound(error) {
  return error?.status === 404;
}

async function getCollection(pb, name) {
  try {
    return await pb.collections.getOne(name);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

function mergeFields(current = [], expected = []) {
  const fields = [...current];
  for (const field of expected) {
    const index = fields.findIndex((candidate) => candidate.name === field.name);
    if (index === -1) fields.push(field);
    else fields[index] = { ...fields[index], ...field };
  }
  return fields;
}

function mergeIndexes(current = [], expected = []) {
  const indexes = [...current];
  for (const index of expected) {
    const marker = index.match(/INDEX\s+(\S+)/i)?.[1];
    if (!marker || !indexes.some((candidate) => candidate.includes(marker))) indexes.push(index);
  }
  return indexes;
}

function contentFields(coursesId) {
  return [
    { name: 'course', type: 'relation', required: true, collectionId: coursesId, cascadeDelete: true, maxSelect: 1 },
    { name: 'title', type: 'text', required: true, min: 1, max: 160 },
    { name: 'description', type: 'editor', required: false },
    { name: 'position', type: 'number', required: false, min: 0, onlyInt: true },
  ];
}

async function ensureCourseConfiguration(pb) {
  let courses = await pb.collections.getOne('courses');
  courses = await pb.collections.update(courses.id, {
    fields: mergeFields(courses.fields, [
      { name: 'contentsEnabled', type: 'bool', required: false },
    ]),
    updateRule: COURSE_UPDATE_RULE,
  });
  return courses;
}

async function ensureCourseContents(pb, courses) {
  const index = 'CREATE INDEX idx_course_contents_order ON course_contents (course, position)';
  let contents = await getCollection(pb, 'course_contents');
  if (!contents) {
    return pb.collections.create({
      name: 'course_contents',
      type: 'base',
      fields: contentFields(courses.id),
      indexes: [index],
      ...COURSE_CONTENT_RULES,
    });
  }
  contents = await pb.collections.update(contents.id, {
    fields: mergeFields(contents.fields, contentFields(courses.id)),
    indexes: mergeIndexes(contents.indexes, [index]),
    ...COURSE_CONTENT_RULES,
  });
  return contents;
}

async function ensureContentLink(pb, contents) {
  const links = await pb.collections.getOne('links');
  return pb.collections.update(links.id, {
    fields: mergeFields(links.fields, [
      { name: 'content', type: 'relation', required: false, collectionId: contents.id, cascadeDelete: true, maxSelect: 1 },
    ]),
    ...LINK_RULES,
  });
}

export async function applyCourseContentSchema(pb) {
  const courses = await ensureCourseConfiguration(pb);
  const contents = await ensureCourseContents(pb, courses);
  const links = await ensureContentLink(pb, contents);
  return { contentsCollectionId: contents.id, linksCollectionId: links.id };
}
