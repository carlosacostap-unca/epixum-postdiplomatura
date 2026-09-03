import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import PocketBase from 'pocketbase';

function digest(values) {
  return createHash('sha256').update([...values].sort().join('\n')).digest('hex');
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export function buildCourseRoleAudit({ users, courses, enrollments, invitations = [] }) {
  const userIds = new Set(users.map((user) => user.id));
  const courseIds = new Set(courses.map((course) => course.id));
  const invitationIds = new Set(invitations.map((invitation) => invitation.id));
  const teacherPairs = [];
  const enrollmentPairs = [];
  const pairCounts = new Map();
  const enrollmentPairSet = new Set();
  const issues = {
    conflictingParticipations: [],
    danglingTeachers: [],
    danglingEnrollments: [],
    danglingInvitations: [],
    duplicateEnrollments: [],
    legacyStudentsWithoutEnrollment: [],
  };

  for (const course of courses) {
    for (const teacherId of uniqueSorted(course.teachers || [])) {
      const pair = `${course.id}:${teacherId}`;
      teacherPairs.push(pair);
      if (!userIds.has(teacherId)) issues.danglingTeachers.push(pair);
    }
  }

  for (const enrollment of enrollments) {
    const pair = `${enrollment.course}:${enrollment.student}`;
    enrollmentPairs.push(pair);
    enrollmentPairSet.add(pair);
    pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
    if (!courseIds.has(enrollment.course) || !userIds.has(enrollment.student)) {
      issues.danglingEnrollments.push(enrollment.id);
    }
    if (enrollment.invitation && !invitationIds.has(enrollment.invitation)) {
      issues.danglingInvitations.push(enrollment.id);
    }
  }

  const teacherPairSet = new Set(teacherPairs);
  issues.conflictingParticipations = uniqueSorted(
    enrollmentPairs.filter((pair) => teacherPairSet.has(pair)),
  );
  issues.duplicateEnrollments = uniqueSorted(
    [...pairCounts].filter(([, count]) => count > 1).map(([pair]) => pair),
  );

  for (const course of courses) {
    for (const studentId of uniqueSorted(course.students || [])) {
      const pair = `${course.id}:${studentId}`;
      if (!enrollmentPairSet.has(pair)) issues.legacyStudentsWithoutEnrollment.push(pair);
    }
  }

  for (const key of Object.keys(issues)) issues[key] = uniqueSorted(issues[key]);
  const issueCount = Object.values(issues).reduce((total, values) => total + values.length, 0);
  const enrollmentIdentity = enrollments.map((enrollment) => [
    enrollment.id,
    enrollment.course,
    enrollment.student,
    enrollment.invitation || '',
    enrollment.created || '',
    enrollment.updated || '',
  ].join(':'));

  return {
    version: 1,
    compatible: issueCount === 0,
    counts: {
      users: users.length,
      courses: courses.length,
      teacherAssignments: teacherPairs.length,
      enrollments: enrollments.length,
      invitations: invitations.length,
      issues: issueCount,
    },
    digests: {
      userIds: digest(users.map((user) => user.id)),
      courseIds: digest(courses.map((course) => course.id)),
      teacherAssignments: digest(teacherPairs),
      enrollments: digest(enrollmentIdentity),
    },
    issues,
  };
}

export function compareCourseRoleAudits(before, after) {
  const fields = [
    'userIds',
    'courseIds',
    'teacherAssignments',
    'enrollments',
  ];
  const differences = fields
    .filter((field) => before.digests?.[field] !== after.digests?.[field])
    .map((field) => ({ field, before: before.digests?.[field], after: after.digests?.[field] }));
  return { equal: differences.length === 0, differences };
}

async function optionalFullList(pb, name, options) {
  try {
    return await pb.collection(name).getFullList(options);
  } catch (error) {
    if (error?.status === 404) return [];
    throw error;
  }
}

async function run() {
  dotenv.config({ path: '.env.local', quiet: true });
  const url = process.env.NEXT_PUBLIC_POCKETBASE_URL;
  const email = process.env.POCKETBASE_SUPERUSER_EMAIL || process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.POCKETBASE_SUPERUSER_PASSWORD || process.env.POCKETBASE_ADMIN_PASSWORD;
  if (!url || !email || !password) throw new Error('Faltan las credenciales de PocketBase en .env.local');

  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(email, password);
  const [users, courses, enrollments, invitations] = await Promise.all([
    pb.collection('users').getFullList({ fields: 'id' }),
    pb.collection('courses').getFullList({ fields: 'id,teachers,students' }),
    pb.collection('course_enrollments').getFullList({ fields: 'id,course,student,invitation,created,updated' }),
    optionalFullList(pb, 'course_enrollment_invitations', { fields: 'id' }),
  ]);

  const audit = {
    generatedAt: new Date().toISOString(),
    targetHost: new URL(url).host,
    ...buildCourseRoleAudit({ users, courses, enrollments, invitations }),
  };
  const compareIndex = process.argv.indexOf('--compare');
  if (compareIndex >= 0) {
    const before = JSON.parse(await readFile(path.resolve(process.argv[compareIndex + 1]), 'utf8'));
    audit.comparison = compareCourseRoleAudits(before, audit);
  }

  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex >= 0) {
    const outputPath = path.resolve(process.argv[outputIndex + 1]);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(audit, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  }

  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
  if (!audit.compatible || audit.comparison?.equal === false) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await run();
}
