import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getList: vi.fn(),
}));

vi.mock("./pocketbase-server", () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { model: null },
    collection: () => ({ getList: mocks.getList }),
    filter: (template: string) => template.startsWith("course") ? "course-filter" : "student-filter",
  })),
}));

import { getCourseStudents, getStudentCourses } from "./data";

describe("getStudentCourses", () => {
  beforeEach(() => mocks.getList.mockReset());

  it("pagina matrículas sin ordenar en PocketBase y tolera fechas ausentes", async () => {
    mocks.getList.mockResolvedValue({
      items: [
        {
          id: "enrollment-1",
          course: "course-1",
          student: "student-1",
          expand: {
            course: { id: "course-1", title: "Curso", description: "", status: "en curso" },
          },
        },
      ],
      totalPages: 1,
    });

    const courses = await getStudentCourses("student-1");

    expect(courses.map((course) => course.id)).toEqual(["course-1"]);
    expect(mocks.getList).toHaveBeenCalledWith(1, 100, {
      filter: "student-filter",
      expand: "course,course.teachers",
    });
  });
});

describe("getCourseStudents", () => {
  beforeEach(() => mocks.getList.mockReset());

  it("pagina estudiantes sin ordenar en PocketBase y conserva el orden de matriculación", async () => {
    mocks.getList.mockResolvedValue({
      items: [
        {
          id: "enrollment-new",
          course: "course-1",
          student: "student-new",
          created: "2026-08-05 12:00:00.000Z",
          expand: {
            student: { id: "student-new", email: "new@example.com", name: "Nueva" },
          },
        },
        {
          id: "enrollment-old",
          course: "course-1",
          student: "student-old",
          created: "2026-08-04 12:00:00.000Z",
          expand: {
            student: { id: "student-old", email: "old@example.com", name: "Anterior" },
          },
        },
      ],
      totalPages: 1,
    });

    const students = await getCourseStudents("course-1");

    expect(students.map((student) => student.id)).toEqual(["student-old", "student-new"]);
    expect(mocks.getList).toHaveBeenCalledWith(1, 100, {
      filter: "course-filter",
      expand: "student",
    });
  });
});
