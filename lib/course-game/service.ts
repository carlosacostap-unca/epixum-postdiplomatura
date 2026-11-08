import 'server-only';
import type PocketBase from 'pocketbase';
import type { Assignment, Class, Course, Delivery, User } from '@/types';
import { getErrorStatus } from '@/lib/errors';
import { isEnrolledInCourse } from '@/lib/course-role-access';
import { getCourseGame } from './catalog';
import { buildCourseGame } from './model';
import { canViewCourseDraft } from '@/lib/course-roles';

export async function authorizeCourseGame(pb: PocketBase, courseId: string) {
  const user = pb.authStore.record as unknown as User | null;
  if (!pb.authStore.isValid || !user?.id) return null;
  let course: Course;
  try { course = await pb.collection('courses').getOne<Course>(courseId); }
  catch (error) { if (getErrorStatus(error) === 404) return null; throw error; }
  const config = getCourseGame(course);
  if (!canViewCourseDraft(course,user)) return null;
  if (!config || course.teachers?.includes(user.id) || !(await isEnrolledInCourse(pb, user.id, course.id))) return null;
  return { course, user, config };
}

export async function readCourseGame(pb: PocketBase, courseId: string) {
  const access = await authorizeCourseGame(pb, courseId);
  if (!access) return null;
  const { course, user, config } = access;
  const filter = pb.filter('course = {:course}', { course: course.id });
  // No elevated client, no writes, and no catch-to-empty on network failures.
  const [classes, assignments, deliveries] = await Promise.all([
    pb.collection('classes').getFullList<Class>({ filter, fields: 'id,course,title,date,publicationStatus,publishAt' }),
    pb.collection('assignments').getFullList<Assignment>({ filter, fields: 'id,course,title,created,dueDate,publicationStatus,publishAt' }),
    pb.collection('deliveries').getFullList<Delivery>({
      filter: pb.filter('assignment.course = {:course} && student = {:student}', { course: course.id, student: user.id }),
      fields: 'id,assignment,student,status,verdict,submissionVersion,evaluatedVersion,resubmissionCount',
    }),
  ]);
  return buildCourseGame({ courseId: course.id, courseTitle: course.title, studentId: user.id, config, classes, assignments, deliveries });
}
