import 'server-only';

import type PocketBase from 'pocketbase';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import {
  COURSE_CANDIDATES_PER_PAGE,
  COURSE_PARTICIPANTS_PER_PAGE,
  classifyCourseParticipantCandidates,
  normalizeParticipantPage,
  normalizeParticipantSearch,
  participantSearchExpression,
  toCourseParticipant,
} from '@/lib/course-participants';
import type {
  Course,
  CourseEnrollment,
  CourseParticipantCandidate,
  CourseParticipantCounts,
  CourseParticipantKind,
  CourseParticipantPage,
  User,
} from '@/types';

function requireAdmin(pb: PocketBase) {
  if (!pb.authStore.model || pb.authStore.model.role !== 'admin') {
    throw new Error('No tienes permisos para administrar participantes.');
  }
}

export async function getCourseParticipantCounts(courseId: string): Promise<CourseParticipantCounts> {
  const pb = await createServerClient();
  requireAdmin(pb);
  const servicePb = await createServiceClient();
  const [course, students, invitations] = await Promise.all([
    servicePb.collection('courses').getOne<Course>(courseId, { fields: 'id,teachers' }),
    servicePb.collection('course_enrollments').getList<CourseEnrollment>(1, 1, {
      filter: servicePb.filter('course = {:courseId}', { courseId }),
      fields: 'id',
    }),
    servicePb.collection('course_enrollment_invitations').getList(1, 1, {
      filter: servicePb.filter('course = {:courseId}', { courseId }),
      fields: 'id',
    }),
  ]);
  return {
    students: students.totalItems,
    teachers: new Set(course.teachers || []).size,
    invitations: invitations.totalItems,
  };
}

export async function getCourseParticipants(
  courseId: string,
  target: CourseParticipantKind,
  input: { page?: number | string; query?: string } = {},
): Promise<CourseParticipantPage> {
  const pb = await createServerClient();
  requireAdmin(pb);
  const servicePb = await createServiceClient();
  const page = normalizeParticipantPage(input.page);
  const query = normalizeParticipantSearch(input.query);
  const filter = servicePb.filter(participantSearchExpression(target, Boolean(query)), { courseId, query });

  if (target === 'students') {
    const result = await servicePb.collection('course_enrollments').getList<CourseEnrollment>(page, COURSE_PARTICIPANTS_PER_PAGE, {
      filter,
      expand: 'student',
      fields: 'id,student,created,expand.student.id,expand.student.name,expand.student.email,expand.student.role',
    });
    return {
      ...result,
      items: result.items.flatMap((enrollment) => enrollment.expand?.student
        ? [toCourseParticipant(enrollment.expand.student, enrollment.id)]
        : []),
    };
  }

  const result = await servicePb.collection('users').getList<User>(page, COURSE_PARTICIPANTS_PER_PAGE, {
    filter,
    fields: 'id,name,email,role,created,updated,collectionId,collectionName',
    sort: 'name,email',
  });
  return { ...result, items: result.items.map((user) => toCourseParticipant(user)) };
}

export async function searchCourseParticipantCandidatesWithClient(
  pb: PocketBase,
  courseId: string,
  target: CourseParticipantKind,
  input: { page?: number | string; query?: string },
): Promise<CourseParticipantPage<CourseParticipantCandidate>> {
  const page = normalizeParticipantPage(input.page);
  const query = normalizeParticipantSearch(input.query);
  if (query.length < 2) return { items: [], page: 1, perPage: COURSE_CANDIDATES_PER_PAGE, totalItems: 0, totalPages: 0 };

  const [course, enrollments, users] = await Promise.all([
    pb.collection('courses').getOne<Course>(courseId, { fields: 'id,teachers' }),
    pb.collection('course_enrollments').getFullList<CourseEnrollment>({
      filter: pb.filter('course = {:courseId}', { courseId }),
      fields: 'id,student',
    }),
    pb.collection('users').getList<User>(page, COURSE_CANDIDATES_PER_PAGE, {
      filter: pb.filter('name ~ {:query} || email ~ {:query}', { query }),
      fields: 'id,name,email,role,created,updated,collectionId,collectionName',
      sort: 'name,email',
    }),
  ]);

  return { ...users, items: classifyCourseParticipantCandidates(users.items, course, enrollments, target) };
}
