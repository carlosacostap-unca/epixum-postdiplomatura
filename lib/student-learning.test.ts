import { describe, expect, it } from "vitest";
import { canSubmitBeforeDeadline, extractEnrolledCourses, getDeadlineState, studentHasEnrollment } from "./student-learning";
import type { Course, CourseEnrollment } from "@/types";

const now = new Date("2026-08-04T12:00:00.000Z");

describe("experiencia y alcance del estudiante", () => {
  it("clasifica vencimientos y bloquea entregas fuera de término", () => {
    expect(getDeadlineState("2026-08-04T11:59:59.000Z", now)).toBe("overdue");
    expect(getDeadlineState("2026-08-06T12:00:00.000Z", now)).toBe("due-soon");
    expect(getDeadlineState("2026-08-10T12:00:00.000Z", now)).toBe("open");
    expect(canSubmitBeforeDeadline("2026-08-04T11:59:59.000Z", now)).toBe(false);
  });

  it("expone solamente cursos provenientes de matrículas", () => {
    const course = { id: "course-a", title: "Curso A" } as Course;
    const enrollments = [{ course: "course-a", student: "student-a", expand: { course } }] as CourseEnrollment[];
    expect(extractEnrolledCourses(enrollments)).toEqual([course]);
    expect(studentHasEnrollment(enrollments, "course-a", "student-a")).toBe(true);
    expect(studentHasEnrollment(enrollments, "course-b", "student-a")).toBe(false);
  });
});
