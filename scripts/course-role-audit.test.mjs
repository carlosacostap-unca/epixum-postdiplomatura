import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCourseRoleAudit, compareCourseRoleAudits } from './course-role-audit.mjs';

const base = {
  users: [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }],
  courses: [
    { id: 'course-a', teachers: ['user-1'], students: [] },
    { id: 'course-b', teachers: [], students: ['user-1'] },
  ],
  enrollments: [
    { id: 'enrollment-1', course: 'course-b', student: 'user-1', created: '2026-01-01', updated: '2026-01-01' },
  ],
};

test('acepta docencia y estudio de la misma persona en cursos diferentes', () => {
  const audit = buildCourseRoleAudit(base);
  assert.equal(audit.compatible, true);
  assert.equal(audit.counts.teacherAssignments, 1);
  assert.equal(audit.counts.enrollments, 1);
});

test('es determinista aunque cambie el orden de los registros y relaciones', () => {
  const first = buildCourseRoleAudit(base);
  const second = buildCourseRoleAudit({
    users: [...base.users].reverse(),
    courses: [...base.courses].reverse().map((course) => ({ ...course, teachers: [...course.teachers].reverse() })),
    enrollments: [...base.enrollments].reverse(),
  });
  assert.deepEqual(first.digests, second.digests);
  assert.deepEqual(compareCourseRoleAudits(first, second), { equal: true, differences: [] });
});

test('bloquea una persona docente y estudiante del mismo curso', () => {
  const audit = buildCourseRoleAudit({
    ...base,
    enrollments: [{ id: 'conflict', course: 'course-a', student: 'user-1' }],
  });
  assert.equal(audit.compatible, false);
  assert.deepEqual(audit.issues.conflictingParticipations, ['course-a:user-1']);
});

test('detecta duplicados, relaciones inválidas y estudiantes heredados sin matrícula', () => {
  const audit = buildCourseRoleAudit({
    users: [{ id: 'user-1' }],
    courses: [{ id: 'course-a', teachers: ['missing-user'], students: ['user-1'] }],
    enrollments: [
      { id: 'enrollment-1', course: 'missing-course', student: 'user-1', invitation: 'missing-invitation' },
      { id: 'enrollment-2', course: 'missing-course', student: 'user-1' },
    ],
  });
  assert.equal(audit.compatible, false);
  assert.deepEqual(audit.issues.danglingTeachers, ['course-a:missing-user']);
  assert.deepEqual(audit.issues.danglingEnrollments, ['enrollment-1', 'enrollment-2']);
  assert.deepEqual(audit.issues.danglingInvitations, ['enrollment-1']);
  assert.deepEqual(audit.issues.duplicateEnrollments, ['missing-course:user-1']);
  assert.deepEqual(audit.issues.legacyStudentsWithoutEnrollment, ['course-a:user-1']);
});

test('la comparación informa exactamente qué conjunto cambió', () => {
  const before = buildCourseRoleAudit(base);
  const after = buildCourseRoleAudit({
    ...base,
    courses: [{ ...base.courses[0], teachers: ['user-1', 'user-2'] }, base.courses[1]],
  });
  const comparison = compareCourseRoleAudits(before, after);
  assert.equal(comparison.equal, false);
  assert.deepEqual(comparison.differences.map((difference) => difference.field), ['teacherAssignments']);
});
