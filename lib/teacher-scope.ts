import type { Course } from "@/types";
import { isAdmin, isAssignedTeacher } from "./course-roles";

type CourseScope = Pick<Course, "id" | "teachers">;

export function teacherCanManageCourse(
  course: CourseScope,
  user: { id: string; role: string },
) {
  return isAdmin(user) || isAssignedTeacher(course, user.id);
}

export function filterRecordsToTeacherCourses<T extends { course?: string }>(
  records: T[],
  courses: CourseScope[],
) {
  const allowedCourseIds = new Set(courses.map((course) => course.id));
  return records.filter((record) => Boolean(record.course && allowedCourseIds.has(record.course)));
}

export function belongsToCourse(record: { course?: string }, courseId: string) {
  return record.course === courseId;
}
