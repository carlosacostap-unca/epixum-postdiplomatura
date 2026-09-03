import { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

export { COURSE_UPDATE_RULE } from './course-schema-rules.mjs';

export const INVITATION_RULES = {
  listRule:
    '@request.auth.role = "admin" || (@request.auth.id != "" && emailNormalized:lower = @request.auth.email:lower && status = "pendiente" && course.enrollmentMode = "invitacion_contrasena" && course.status != "borrador")',
  viewRule:
    '@request.auth.role = "admin" || (@request.auth.id != "" && emailNormalized:lower = @request.auth.email:lower && status = "pendiente" && course.enrollmentMode = "invitacion_contrasena" && course.status != "borrador")',
  createRule: '@request.auth.role = "admin"',
  updateRule: '@request.auth.role = "admin"',
  deleteRule: '@request.auth.role = "admin"',
};

export const ATTEMPT_RULES = {
  listRule: '@request.auth.role = "admin" || student = @request.auth.id',
  viewRule: '@request.auth.role = "admin" || student = @request.auth.id',
  createRule:
    '@request.auth.id != "" && student = @request.auth.id && invitation.status = "pendiente" && invitation.emailNormalized:lower = @request.auth.email:lower && invitation.course.id = course.id && course.enrollmentMode = "invitacion_contrasena"',
  updateRule: null,
  deleteRule: '@request.auth.role = "admin"',
};

export const ENROLLMENT_RULES = {
  listRule:
    'student = @request.auth.id || course.teachers.id ?= @request.auth.id || @request.auth.role = "admin"',
  viewRule:
    'student = @request.auth.id || course.teachers.id ?= @request.auth.id || @request.auth.role = "admin"',
  createRule: null,
  updateRule: null,
  deleteRule: 'course.teachers.id ?= @request.auth.id || @request.auth.role = "admin"',
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

function mergeFields(current, expected) {
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

const AUDIT_FIELDS = [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
];

async function ensureCourseFields(pb, courses) {
  const fields = mergeFields(courses.fields, [
    {
      name: 'enrollmentMode',
      type: 'select',
      required: false,
      maxSelect: 1,
      values: ['clave', 'invitacion_contrasena'],
    },
    {
      name: 'invitationPasswordHash',
      type: 'text',
      required: false,
      hidden: true,
      min: 64,
      max: 64,
      pattern: '^[a-f0-9]{64}$',
    },
  ]);
  courses = await pb.collections.update(courses.id, { fields, updateRule: COURSE_UPDATE_RULE });

  const records = await pb.collection('courses').getFullList({ fields: 'id,enrollmentMode' });
  let initializedCourses = 0;
  for (const course of records) {
    if (course.enrollmentMode) continue;
    await pb.collection('courses').update(course.id, { enrollmentMode: 'clave' });
    initializedCourses += 1;
  }
  return { courses, initializedCourses };
}

async function ensureCollection(pb, name, fields, indexes, rules) {
  let collection = await getCollection(pb, name);
  if (!collection) {
    // Los campos automáticos (incluido `created`) se materializan al crear la
    // colección. Los índices se agregan después para poder referenciarlos.
    collection = await pb.collections.create({ name, type: 'base', fields, indexes: [], ...rules });
    if (indexes.length === 0) return collection;
    return pb.collections.update(collection.id, {
      indexes: mergeIndexes(collection.indexes, indexes),
    });
  }
  collection = await pb.collections.update(collection.id, {
    fields: mergeFields(collection.fields, fields),
    indexes: mergeIndexes(collection.indexes, indexes),
    ...rules,
  });
  return collection;
}

export async function applyInvitationSchema(pb) {
  const users = await pb.collections.getOne('users');
  const initialCourses = await pb.collections.getOne('courses');
  const { courses, initializedCourses } = await ensureCourseFields(pb, initialCourses);

  const invitations = await ensureCollection(
    pb,
    'course_enrollment_invitations',
    [
      { name: 'course', type: 'relation', required: true, collectionId: courses.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'emailNormalized', type: 'email', required: true },
      { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['pendiente', 'activada', 'revocada'] },
      { name: 'activatedStudent', type: 'relation', required: false, collectionId: users.id, cascadeDelete: false, maxSelect: 1 },
      { name: 'activatedAt', type: 'date', required: false },
      ...AUDIT_FIELDS,
    ],
    ['CREATE UNIQUE INDEX idx_course_invitation_email ON course_enrollment_invitations (course, emailNormalized)'],
    INVITATION_RULES,
  );

  const attempts = await ensureCollection(
    pb,
    'course_enrollment_attempts',
    [
      { name: 'course', type: 'relation', required: true, collectionId: courses.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'invitation', type: 'relation', required: true, collectionId: invitations.id, cascadeDelete: true, maxSelect: 1 },
      { name: 'student', type: 'relation', required: true, collectionId: users.id, cascadeDelete: true, maxSelect: 1 },
      ...AUDIT_FIELDS,
    ],
    ['CREATE INDEX idx_course_invitation_attempts ON course_enrollment_attempts (student, course, created)'],
    ATTEMPT_RULES,
  );

  const enrollments = await pb.collections.getOne('course_enrollments');
  await pb.collections.update(enrollments.id, {
    fields: mergeFields(enrollments.fields, [
      { name: 'invitation', type: 'relation', required: false, collectionId: invitations.id, cascadeDelete: false, maxSelect: 1 },
    ]),
    ...ENROLLMENT_RULES,
  });

  return {
    initializedCourses,
    invitationsCollectionId: invitations.id,
    attemptsCollectionId: attempts.id,
  };
}
