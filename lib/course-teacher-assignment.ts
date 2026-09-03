import "server-only";

import type PocketBase from "pocketbase";
import type { Course } from "@/types";

function isNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

export async function validateTeacherSelection(servicePb: PocketBase, courseId: string | undefined, requestedTeacherIds: string[]) {
  const teacherIds = [...new Set(requestedTeacherIds.filter(Boolean))];

  for (const teacherId of teacherIds) {
    try {
      await servicePb.collection("users").getOne(teacherId, { fields: "id" });
    } catch (error) {
      if (isNotFound(error)) throw new Error("Una de las cuentas seleccionadas como docente ya no existe.");
      throw error;
    }

    if (!courseId) continue;
    try {
      await servicePb.collection("course_enrollments").getFirstListItem(
        servicePb.filter("course = {:courseId} && student = {:teacherId}", { courseId, teacherId }),
        { fields: "id" },
      );
      throw new Error("No podés asignar como docente a una persona matriculada en este mismo curso.");
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  return teacherIds;
}

export async function verifyPersistedTeachers(servicePb: PocketBase, courseId: string, expectedTeacherIds: string[]) {
  const persisted = await servicePb.collection("courses").getOne<Course>(courseId, { fields: "id,teachers" });
  const expected = [...expectedTeacherIds].sort();
  const actual = [...(persisted.teachers || [])].sort();
  if (expected.length !== actual.length || expected.some((id, index) => id !== actual[index])) {
    throw new Error("No pudimos verificar la asignación docente del curso.");
  }
}
