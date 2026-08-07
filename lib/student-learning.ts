import type { Course, CourseEnrollment } from "@/types";

export type DeadlineState = "open" | "due-soon" | "overdue" | "no-deadline";

export function getDeadlineState(dueDate?: string, now = new Date()): DeadlineState {
  if (!dueDate) return "no-deadline";
  const deadline = new Date(dueDate);
  if (Number.isNaN(deadline.getTime())) return "no-deadline";
  const remaining = deadline.getTime() - now.getTime();
  if (remaining < 0) return "overdue";
  if (remaining <= 72 * 60 * 60 * 1000) return "due-soon";
  return "open";
}

export function canSubmitBeforeDeadline(dueDate?: string, now = new Date()) {
  return getDeadlineState(dueDate, now) !== "overdue";
}

export function extractEnrolledCourses(enrollments: CourseEnrollment[]) {
  return enrollments
    .map((enrollment) => enrollment.expand?.course)
    .filter((course): course is Course => Boolean(course));
}

export function studentHasEnrollment(
  enrollments: Array<Pick<CourseEnrollment, "course" | "student">>,
  courseId: string,
  studentId: string,
) {
  return enrollments.some((enrollment) => enrollment.course === courseId && enrollment.student === studentId);
}
