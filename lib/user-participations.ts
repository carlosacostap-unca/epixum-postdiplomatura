import type { Course, CourseEnrollment } from "@/types";

export interface UserParticipationSummary {
  teaching: Array<{ id: string; title: string }>;
  studying: Array<{ id: string; title: string }>;
}

export function buildUserParticipationSummaries(
  courses: Array<Pick<Course, "id" | "title" | "teachers">>,
  enrollments: Array<Pick<CourseEnrollment, "course" | "student">>,
) {
  const summaries: Record<string, UserParticipationSummary> = {};
  const ensure = (userId: string) => summaries[userId] ||= { teaching: [], studying: [] };
  const courseById = new Map(courses.map((course) => [course.id, course]));
  for (const course of courses) {
    for (const teacherId of course.teachers || []) ensure(teacherId).teaching.push({ id: course.id, title: course.title });
  }
  for (const enrollment of enrollments) {
    const course = courseById.get(enrollment.course);
    if (course) ensure(enrollment.student).studying.push({ id: course.id, title: course.title });
  }
  return summaries;
}
