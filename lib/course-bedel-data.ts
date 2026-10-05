import 'server-only';
import { createServerClient } from '@/lib/pocketbase-server';
import { createServiceClient } from '@/lib/pocketbase-service';
import { requireBedelAssignment } from '@/lib/course-bedel-access';
import type { CourseBedel } from '@/lib/course-bedels';
import { readAttendanceReport } from '@/lib/course-attendance-service';
import type { Assignment, Class, Course, CourseContent, CourseWeek, InteractiveLesson, Link } from '@/types';

const COURSE_FIELDS = 'id,title,description,status,organizationMode,contentsEnabled,interactiveClassesEnabled,reviewsEnabled';

export async function getCourseBedels(courseId: string) {
  const pb = await createServerClient();
  if (!pb.authStore.isValid || pb.authStore.model?.role !== 'admin') throw new Error('No autorizado.');
  return pb.collection('course_bedels').getFullList<CourseBedel>({
    filter: pb.filter('course = {:courseId}', { courseId }), sort: 'lastName,firstName,email',
    fields: 'id,course,firstName,lastName,email',
  });
}

export async function getBedelCourses() {
  const pb = await createServerClient();
  const user = pb.authStore.model;
  if (!pb.authStore.isValid || !user?.email || !user.verified) return [];
  const assignments = await pb.collection('course_bedels').getFullList<CourseBedel>({
    filter: pb.filter('email:lower = {:email}', { email: String(user.email).trim().toLowerCase() }),
    expand: 'course', fields: `id,course,${COURSE_FIELDS.split(',').map(field => `expand.course.${field}`).join(',')}`,
  });
  return assignments.flatMap(row => row.expand?.course ? [row.expand.course] : [])
    .sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

// Re-check the assignment on every request, before creating the privileged client.
// The service only reads a fixed set of course-scoped fields. No action accepts it from a browser.
export async function getBedelCourse(courseId: string) {
  const pb = await createServerClient();
  await requireBedelAssignment(pb, courseId);
  const service = await createServiceClient();
  const course = await service.collection('courses').getOne<Course>(courseId, { fields: COURSE_FIELDS });
  const filter = service.filter('course = {:courseId}', { courseId });
  const [classes, assignments, contents, weeks, lessons, links] = await Promise.all([
    service.collection('classes').getFullList<Class>({ filter, sort: 'date', fields: 'id,title,description,date,week' }),
    service.collection('assignments').getFullList<Assignment>({ filter, sort: 'dueDate', fields: 'id,title,description,dueDate,week' }),
    course.contentsEnabled ? service.collection('course_contents').getFullList<CourseContent>({ filter, sort: 'position', fields: 'id,title,description' }) : [],
    course.organizationMode === 'semanal' ? service.collection('course_weeks').getFullList<CourseWeek>({ filter, sort: 'number', fields: 'id,number,title,status' }) : [],
    course.interactiveClassesEnabled ? service.collection('interactive_lessons').getFullList<InteractiveLesson>({ filter, sort: 'title', fields: 'id,title,description,material' }) : [],
    service.collection('links').getFullList<Link>({
      filter: service.filter('(class.course = {:courseId} || assignment.course = {:courseId}' + (course.contentsEnabled ? ' || content.course = {:courseId}' : '') + ')', { courseId }),
      fields: 'id,title,url,type,class,assignment,content',
    }),
  ]);
  return { course, classes, assignments, contents, weeks, lessons, links };
}

export interface BedelAttendance {
  id: string;
  attendance: 'present' | 'absent';
  expand?: {
    student?: { name: string; firstName?: string; lastName?: string };
    review?: { title: string };
    slot?: { startsAt: string };
  };
}

export async function getBedelAttendance(courseId: string) {
  const pb = await createServerClient();
  await requireBedelAssignment(pb, courseId);
  const service = await createServiceClient();
  const course = await service.collection('courses').getOne<Course>(courseId, { fields: 'id,title,reviewsEnabled,interactiveClassesEnabled,attendanceEnabled' });
  const report = course.interactiveClassesEnabled || course.attendanceEnabled
    ? await readAttendanceReport(service, courseId) : null;
  if (report) {
    for (const row of report.rows) {
      for (const cell of Object.values(row.cells)) cell.editable = false;
    }
  }
  const attendance = course.reviewsEnabled ? await service.collection('review_bookings').getFullList<BedelAttendance>({
    filter: service.filter('review.course = {:courseId} && slot.review.course = {:courseId} && attendance != "" && status != "cancelled"', { courseId }),
    sort: '-slot.startsAt', expand: 'student,review,slot',
    fields: 'id,attendance,expand.student.name,expand.student.firstName,expand.student.lastName,expand.review.title,expand.slot.startsAt',
  }) : [];
  return { course, report, attendance };
}
