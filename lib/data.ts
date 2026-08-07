import { createServerClient } from './pocketbase-server';
import { Class, Link, Assignment, User, Delivery, Course, CourseEnrollment, Inquiry, CourseWeek, CourseEnrollmentInvitation } from '@/types';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';
import PocketBase from 'pocketbase';
import { cookies } from 'next/headers';
import { extractEnrolledCourses, getDeadlineState } from './student-learning';
import { filterContentForCourseMode, groupContentByWeek, isWeekEffectivelyVisible, unassignedContent } from './course-weeks';

// Helper to create client with token for cached functions
const createClientWithToken = (token: string | undefined) => {
    const url = process.env['NEXT_PUBLIC_POCKETBASE_URL'];
    if (!url) {
        console.error("CRITICAL ERROR: NEXT_PUBLIC_POCKETBASE_URL is not set");
    }
    const pb = new PocketBase(url);
    // Disable autoCancellation to avoid issues in cached context
    pb.autoCancellation(false);
    if (token) {
        pb.authStore.save(token, null);
    }
    return pb;
};

// Cached fetchers using unstable_cache (Data Cache)
const getUsersCached = unstable_cache(
    async (token: string | undefined) => {
        const pb = createClientWithToken(token);
        return await pb.collection('users').getFullList<User>({
            sort: 'created',
        });
    },
    ['users-list'],
    { revalidate: 60, tags: ['users'] }
);

const getStudentsCached = unstable_cache(
    async (token: string | undefined) => {
        const pb = createClientWithToken(token);
        return await pb.collection('users').getFullList<User>({
            filter: 'role = "estudiante"',
            sort: 'name',
        });
    },
    ['students-list'],
    { revalidate: 60, tags: ['users'] }
);

// Exported functions with request memoization (React.cache)

export const getUsers = cache(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('pb_auth')?.value;
    return getUsersCached(token);
});

export const getStudents = cache(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('pb_auth')?.value;
    return getStudentsCached(token);
});

export async function getAllCourses() {
    const pb = await createServerClient();
    const records = await pb.collection('courses').getFullList<Course>({
        sort: '-created',
        expand: 'teachers'
    });
    return records;
}

export async function getTeacherCourses(teacherId: string) {
    const pb = await createServerClient();
    const records = await pb.collection('courses').getFullList<Course>({
        filter: `teachers ~ "${teacherId}"`,
        sort: '-created',
        expand: 'teachers'
    });
    return records;
}

export type TeacherDashboardDelivery = Omit<Delivery, "expand"> & {
  expand?: {
    assignment?: Assignment;
    student?: User;
  };
};

export interface TeacherDashboardData {
  courses: Course[];
  pendingDeliveries: TeacherDashboardDelivery[];
  pendingDeliveryCount: number;
  pendingInquiries: Inquiry[];
  pendingInquiryCount: number;
}

function relationFilter(
  pb: PocketBase,
  field: string,
  ids: string[],
) {
  const values: Record<string, string> = {};
  const conditions = ids.map((id, index) => {
    const key = `id${index}`;
    values[key] = id;
    return `${field} = {:${key}}`;
  });
  return pb.filter(`(${conditions.join(" || ")})`, values);
}

export async function getTeacherDashboardData(teacherId: string): Promise<TeacherDashboardData> {
  const courses = await getTeacherCourses(teacherId);
  if (courses.length === 0) {
    return {
      courses,
      pendingDeliveries: [],
      pendingDeliveryCount: 0,
      pendingInquiries: [],
      pendingInquiryCount: 0,
    };
  }

  const pb = await createServerClient();
  const courseIds = courses.map((course) => course.id);
  const assignments = await pb.collection("assignments").getFullList<Assignment>({
    filter: relationFilter(pb, "course", courseIds),
    fields: "id,course,title,dueDate",
    sort: "dueDate",
  });

  const inquiryPromise = pb.collection("inquiries").getList<Inquiry>(1, 6, {
    filter: `${relationFilter(pb, "course", courseIds)} && status = "Pendiente"`,
    sort: "created",
    expand: "author,course,class,assignment",
  });

  const deliveryPromise = assignments.length > 0
    ? pb.collection("deliveries").getList<TeacherDashboardDelivery>(1, 6, {
        filter: `${relationFilter(pb, "assignment", assignments.map((assignment) => assignment.id))} && status != "published"`,
        sort: "created",
        expand: "student,assignment",
      })
    : Promise.resolve({ items: [], totalItems: 0 });

  const [inquiryResult, deliveryResult] = await Promise.all([inquiryPromise, deliveryPromise]);

  return {
    courses,
    pendingDeliveries: deliveryResult.items,
    pendingDeliveryCount: deliveryResult.totalItems,
    pendingInquiries: inquiryResult.items,
    pendingInquiryCount: inquiryResult.totalItems,
  };
}

export async function getStudentCourses(studentId: string) {
    const pb = await createServerClient();
    const enrollments: CourseEnrollment[] = [];
    let page = 1;
    let totalPages = 1;

    // This PocketBase collection rejects server-side sorting when its relation
    // access rule is evaluated. Page normally, then preserve the intended
    // newest-first order in memory.
    do {
      const result = await pb.collection('course_enrollments').getList<CourseEnrollment>(page, 100, {
          filter: pb.filter('student = {:studentId}', { studentId }),
          expand: 'course,course.teachers'
      });
      enrollments.push(...result.items);
      totalPages = result.totalPages;
      page += 1;
    } while (page <= totalPages);

    enrollments.sort((a, b) => String(b.created || "").localeCompare(String(a.created || "")));
    return extractEnrolledCourses(enrollments);
}

export type StudentDashboardClass = Omit<Class, "expand"> & {
  expand?: { course?: Course };
};

export type StudentDashboardAssignment = Omit<Assignment, "expand"> & {
  expand?: { course?: Course };
};

export interface StudentDashboardData {
  courses: Course[];
  nextActivityByCourse: Record<string, { date?: string; href: string; title: string; type: "class" | "assignment" }>;
  nextClass: StudentDashboardClass | null;
  pendingAssignments: StudentDashboardAssignment[];
  pendingAssignmentCount: number;
  pendingInquiries: Inquiry[];
  pendingInquiryCount: number;
}

export async function getStudentDashboardData(studentId: string): Promise<StudentDashboardData> {
  const courses = await getStudentCourses(studentId);
  if (courses.length === 0) {
    return { courses, nextActivityByCourse: {}, nextClass: null, pendingAssignments: [], pendingAssignmentCount: 0, pendingInquiries: [], pendingInquiryCount: 0 };
  }

  const pb = await createServerClient();
  const courseIds = courses.map((course) => course.id);
  const [rawClasses, rawAssignments, inquiryResult] = await Promise.all([
    pb.collection("classes").getFullList<StudentDashboardClass>({
      filter: relationFilter(pb, "course", courseIds),
      sort: "date",
      expand: "course",
    }),
    pb.collection("assignments").getFullList<StudentDashboardAssignment>({
      filter: relationFilter(pb, "course", courseIds),
      sort: "dueDate",
      expand: "course",
    }),
    pb.collection("inquiries").getList<Inquiry>(1, 5, {
      filter: `${relationFilter(pb, "course", courseIds)} && author = ${JSON.stringify(studentId)} && status = "Pendiente"`,
      sort: "-updated",
      expand: "course,class,assignment,week",
    }),
  ]);

  const weeklyCourseIds = courses.filter((course) => course.organizationMode === 'semanal').map((course) => course.id);
  const weeks = weeklyCourseIds.length
    ? await pb.collection('course_weeks').getFullList<CourseWeek>({ filter: relationFilter(pb, 'course', weeklyCourseIds) })
    : [];
  const visibleWeekIdSet = new Set(weeks.filter((week) => isWeekEffectivelyVisible(week)).map((week) => week.id));
  const weeklyCourseIdSet = new Set(weeklyCourseIds);
  const isDashboardRecordVisible = (record: { course?: string; week?: string }) =>
    Boolean(record.course && (!weeklyCourseIdSet.has(record.course) || (record.week && visibleWeekIdSet.has(record.week))));
  const classes = rawClasses.filter(isDashboardRecordVisible);
  const assignments = rawAssignments.filter(isDashboardRecordVisible);
  const visiblePendingInquiries = inquiryResult.items.filter(isDashboardRecordVisible);

  const assignmentIds = assignments.map((assignment) => assignment.id);
  const deliveries = assignmentIds.length > 0
    ? await pb.collection("deliveries").getFullList<Delivery>({
        filter: `${relationFilter(pb, "assignment", assignmentIds)} && student = ${JSON.stringify(studentId)}`,
        fields: "id,assignment,status",
      })
    : [];
  const deliveredIds = new Set(deliveries.map((delivery) => delivery.assignment));
  const now = new Date();
  const pendingAssignments = assignments
    .filter((assignment) => !deliveredIds.has(assignment.id) && getDeadlineState(assignment.dueDate, now) !== "overdue")
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  const nextClass = classes.find((classItem) => Boolean(classItem.date && new Date(classItem.date) >= now)) ?? null;
  const nextActivityByCourse: StudentDashboardData["nextActivityByCourse"] = {};
  for (const course of courses) {
    const courseClass = classes.find((classItem) => classItem.course === course.id && classItem.date && new Date(classItem.date) >= now);
    const courseAssignment = pendingAssignments.find((assignment) => assignment.course === course.id);
    const classTime = courseClass?.date ? new Date(courseClass.date).getTime() : Number.POSITIVE_INFINITY;
    const assignmentTime = courseAssignment?.dueDate ? new Date(courseAssignment.dueDate).getTime() : Number.POSITIVE_INFINITY;
    if (courseAssignment && assignmentTime <= classTime) {
      nextActivityByCourse[course.id] = { type: "assignment", title: courseAssignment.title, date: courseAssignment.dueDate, href: `/estudiantes/cursos/${course.id}/tps/${courseAssignment.id}` };
    } else if (courseClass) {
      nextActivityByCourse[course.id] = { type: "class", title: courseClass.title, date: courseClass.date, href: `/estudiantes/cursos/${course.id}/clases/${courseClass.id}` };
    } else if (courseAssignment) {
      nextActivityByCourse[course.id] = { type: "assignment", title: courseAssignment.title, date: courseAssignment.dueDate, href: `/estudiantes/cursos/${course.id}/tps/${courseAssignment.id}` };
    }
  }

  return {
    courses,
    nextActivityByCourse,
    nextClass,
    pendingAssignments: pendingAssignments.slice(0, 6),
    pendingAssignmentCount: pendingAssignments.length,
    pendingInquiries: visiblePendingInquiries,
    pendingInquiryCount: visiblePendingInquiries.length,
  };
}

export async function isStudentEnrolled(courseId: string, studentId: string) {
  const pb = await createServerClient();
  try {
    await pb.collection('course_enrollments').getFirstListItem(
      pb.filter('course = {:courseId} && student = {:studentId}', { courseId, studentId })
    );
    return true;
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      error.status === 404
    ) {
      return false;
    }
    throw error;
  }
}

export async function getCourseStudents(courseId: string) {
  const pb = await createServerClient();
  const enrollments: CourseEnrollment[] = [];
  let page = 1;
  let totalPages = 1;

  // PocketBase rejects server-side sorting for this collection when its
  // relational access rule is evaluated. Fetch every allowed page first and
  // restore the intended oldest-first order locally.
  do {
    const result = await pb.collection('course_enrollments').getList<CourseEnrollment>(page, 100, {
      filter: pb.filter('course = {:courseId}', { courseId }),
      expand: 'student',
    });
    enrollments.push(...result.items);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages);

  enrollments.sort((a, b) => String(a.created || '').localeCompare(String(b.created || '')));

  return enrollments
    .map((enrollment) => enrollment.expand?.student)
    .filter((student): student is User => Boolean(student));
}

export async function getCourseInvitations(
  courseId: string,
  page = 1,
  status?: 'pendiente' | 'activada' | 'revocada',
) {
  const pb = await createServerClient();
  const statusFilter = status ? ' && status = {:status}' : '';
  return pb.collection('course_enrollment_invitations').getList<CourseEnrollmentInvitation>(page, 25, {
    filter: pb.filter(`course = {:courseId}${statusFilter}`, { courseId, status: status || '' }),
    sort: '-created',
    expand: 'activatedStudent',
  });
}

export async function getStudentPendingInvitations() {
  const pb = await createServerClient();
  return pb.collection('course_enrollment_invitations').getFullList<CourseEnrollmentInvitation>({
    filter: 'status = "pendiente" && course.enrollmentMode = "invitacion_contrasena" && course.status != "borrador"',
    sort: '-created',
    expand: 'course',
  });
}

export async function getCourse(id: string) {
  const pb = await createServerClient();
  const record = await pb.collection('courses').getOne<Course>(id, {
      expand: 'teachers,classes,assignments,inquiries'
  });
  return record;
}

export async function getCourseWeeks(courseId: string) {
  const pb = await createServerClient();
  const records = await pb.collection('course_weeks').getFullList<CourseWeek>({
    filter: pb.filter('course = {:courseId}', { courseId }),
    expand: 'course',
  });
  return records.sort((a, b) => a.number - b.number || a.title.localeCompare(b.title, 'es'));
}

export async function studentCanAccessCourseContent(course: Course, weekId?: string) {
  if (course.organizationMode !== 'semanal') return true;
  if (!weekId) return false;
  const pb = await createServerClient();
  try {
    const week = await pb.collection('course_weeks').getOne<CourseWeek>(weekId, {
      fields: 'id,course,status,publishAt',
    });
    return week.course === course.id && isWeekEffectivelyVisible(week);
  } catch {
    return false;
  }
}

export interface CourseWeekGroup {
  week: CourseWeek;
  classes: Class[];
  assignments: Assignment[];
  inquiries: Inquiry[];
}

export interface CourseOrganizationData {
  weeks: CourseWeek[];
  groups: CourseWeekGroup[];
  allClasses: Class[];
  allAssignments: Assignment[];
  allInquiries: Inquiry[];
  classes: Class[];
  assignments: Assignment[];
  inquiries: Inquiry[];
  unassigned: { classes: Class[]; assignments: Assignment[]; inquiries: Inquiry[] };
}

export async function getCourseOrganizationData(course: Course, now = new Date()): Promise<CourseOrganizationData> {
  const pb = await createServerClient();
  const filter = pb.filter('course = {:courseId}', { courseId: course.id });
  const [weeks, classes, assignments, inquiries] = await Promise.all([
    pb.collection('course_weeks').getFullList<CourseWeek>({ filter, expand: 'course' }),
    pb.collection('classes').getFullList<Class>({ filter }),
    pb.collection('assignments').getFullList<Assignment>({ filter }),
    pb.collection('inquiries').getFullList<Inquiry>({ filter, expand: 'author,class,assignment,week' }),
  ]);
  weeks.sort((a, b) => a.number - b.number || a.title.localeCompare(b.title, 'es'));
  classes.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  assignments.sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')));
  inquiries.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));

  const visibleClasses = filterContentForCourseMode(course, weeks, classes, now);
  const visibleAssignments = filterContentForCourseMode(course, weeks, assignments, now);
  const visibleInquiries = filterContentForCourseMode(course, weeks, inquiries, now);
  const classGroups = groupContentByWeek(weeks, classes);
  const assignmentGroups = groupContentByWeek(weeks, assignments);
  const inquiryGroups = groupContentByWeek(weeks, inquiries);

  return {
    weeks,
    groups: weeks.map((week) => ({
      week,
      classes: classGroups.get(week.id) || [],
      assignments: assignmentGroups.get(week.id) || [],
      inquiries: inquiryGroups.get(week.id) || [],
    })),
    allClasses: classes,
    allAssignments: assignments,
    allInquiries: inquiries,
    classes: visibleClasses,
    assignments: visibleAssignments,
    inquiries: visibleInquiries,
    unassigned: {
      classes: unassignedContent(classes),
      assignments: unassignedContent(assignments),
      inquiries: unassignedContent(inquiries),
    },
  };
}

export async function getAllClasses() {
    const pb = await createServerClient();
    const records = await pb.collection('classes').getFullList<Class>();
    return records.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

export async function getClassesByCourse(courseId: string) {
    const pb = await createServerClient();
    const records = await pb.collection('classes').getFullList<Class>({
        filter: pb.filter('course = {:courseId}', { courseId }),
    });
    return records.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}

export async function getClass(id: string) {
  const pb = await createServerClient();
  const record = await pb.collection('classes').getOne<Class>(id);
  return record;
}

export async function getAllAssignments() {
  const pb = await createServerClient();
  const records = await pb.collection('assignments').getFullList<Assignment>();
  return records.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
}

export async function getAssignmentsByCourse(courseId: string) {
  try {
    const pb = await createServerClient();
    const records = await pb.collection('assignments').getFullList<Assignment>({
        filter: pb.filter('course = {:courseId}', { courseId }),
    });
    return records.sort((a, b) => String(a.created || '').localeCompare(String(b.created || '')));
  } catch (error) {
    console.error('Error fetching assignments by course:', error);
    return [];
  }
}

export async function getAssignment(id: string) {
  const pb = await createServerClient();
  const record = await pb.collection('assignments').getOne<Assignment>(id);
  return record;
}

export async function getLinks(parentId: string, parentType: 'class' | 'assignment' = 'class') {
  const pb = await createServerClient();
  const records = await pb.collection('links').getFullList<Link>({
      filter: `${parentType} = "${parentId}"`,
      sort: 'created',
  });
  return records;
}

export async function getDeliveries(assignmentId: string) {
  const pb = await createServerClient();
  try {
     const records = await pb.collection('deliveries').getFullList<Delivery>({
         filter: `assignment = "${assignmentId}"`,
         sort: '-created',
         expand: 'student',
     });
     
     return records;
   } catch (error) {
     console.error('Error fetching deliveries:', error);
     return [];
   }
}

export async function getUserDelivery(assignmentId: string, userId: string) {
  const pb = await createServerClient();
  try {
    const record = await pb.collection('deliveries').getFirstListItem<Delivery>(
        `assignment = "${assignmentId}" && student = "${userId}"`
    );
    return record;
  } catch {
    // It's normal to not have a delivery yet
    return null;
  }
}

export async function getDeliveryById(deliveryId: string) {
  const pb = await createServerClient();
  try {
    const record = await pb.collection('deliveries').getOne<Delivery>(deliveryId, {
        expand: 'student',
    });
    return record;
  } catch (error) {
    console.error('Error fetching delivery by ID:', error);
    return null;
  }
}
