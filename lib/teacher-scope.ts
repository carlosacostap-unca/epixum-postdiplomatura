import type { Course } from "@/types";

type CourseScope = Pick<Course, "id" | "teachers">;

export function teacherCanManageCourse(
  course: CourseScope,
  user: { id: string; role: string },
) {
  return user.role === "admin" || (
    user.role === "docente" && Boolean(course.teachers?.includes(user.id))
  );
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
