import { describe, expect, it } from "vitest";
import { belongsToCourse, filterRecordsToTeacherCourses, teacherCanManageCourse } from "./teacher-scope";

const assignedCourse = { id: "course-a", teachers: ["teacher-a"] };
const otherCourse = { id: "course-b", teachers: ["teacher-b"] };

describe("alcance docente", () => {
  it("permite gestionar únicamente cursos asignados al docente", () => {
    const teacher = { id: "teacher-a", role: "docente" };
    expect(teacherCanManageCourse(assignedCourse, teacher)).toBe(true);
    expect(teacherCanManageCourse(otherCourse, teacher)).toBe(false);
  });

  it("mantiene acceso administrativo y deriva docencia de la asignación", () => {
    expect(teacherCanManageCourse(otherCourse, { id: "admin-a", role: "admin" })).toBe(true);
    expect(teacherCanManageCourse(assignedCourse, { id: "teacher-a", role: "estudiante" })).toBe(true);
    expect(teacherCanManageCourse(assignedCourse, { id: "student-a", role: "docente" })).toBe(false);
  });

  it("filtra pendientes y contenido a los cursos asignados", () => {
    const records = [
      { id: "own", course: "course-a" },
      { id: "other", course: "course-b" },
      { id: "unscoped" },
    ];
    expect(filterRecordsToTeacherCourses(records, [assignedCourse])).toEqual([{ id: "own", course: "course-a" }]);
    expect(belongsToCourse(records[0], "course-a")).toBe(true);
    expect(belongsToCourse(records[1], "course-a")).toBe(false);
  });
});
