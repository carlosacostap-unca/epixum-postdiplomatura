import type {
  Course,
  CourseEnrollment,
  CourseParticipant,
  CourseParticipantCandidate,
  CourseParticipantKind,
  User,
} from '@/types';

export const COURSE_PARTICIPANTS_PER_PAGE = 20;
export const COURSE_CANDIDATES_PER_PAGE = 20;

export function normalizeParticipantSearch(value: string | undefined) {
  return (value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

export function normalizeParticipantPage(value: number | string | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function userDisplayName(user: Pick<User, 'name' | 'username' | 'email'>) {
  return user.name?.trim() || user.username?.trim() || user.email;
}

export function toCourseParticipant(user: User, enrollmentId?: string): CourseParticipant {
  return {
    id: enrollmentId || user.id,
    userId: user.id,
    enrollmentId,
    name: userDisplayName(user),
    email: user.email,
    username: user.username || '',
    globalRole: user.role,
  };
}

export function classifyCourseParticipantCandidates(
  users: User[],
  course: Pick<Course, 'teachers'>,
  enrollments: Array<Pick<CourseEnrollment, 'student'>>,
  target: CourseParticipantKind,
): CourseParticipantCandidate[] {
  const teacherIds = new Set(course.teachers || []);
  const studentIds = new Set(enrollments.map((enrollment) => enrollment.student));

  return users.map((user) => {
    const participant = toCourseParticipant(user);
    const current = target === 'students' ? studentIds.has(user.id) : teacherIds.has(user.id);
    const incompatible = target === 'students' ? teacherIds.has(user.id) : studentIds.has(user.id);
    if (current) {
      return { ...participant, state: 'current', reason: target === 'students' ? 'Ya es alumno de este curso.' : 'Ya es docente de este curso.' };
    }
    if (incompatible) {
      return {
        ...participant,
        state: 'incompatible',
        reason: target === 'students'
          ? 'Primero retiralo como docente de este curso.'
          : 'Primero retiralo como alumno de este curso.',
      };
    }
    return { ...participant, state: 'available' };
  });
}

export function participantSearchExpression(target: CourseParticipantKind, hasQuery: boolean) {
  const prefix = target === 'students'
    ? 'course = {:courseId}'
    : 'courses_via_teachers.id ?= {:courseId}';
  if (!hasQuery) return prefix;
  const relation = target === 'students' ? 'student.' : '';
  return `${prefix} && (${relation}name ~ {:query} || ${relation}email ~ {:query})`;
}
