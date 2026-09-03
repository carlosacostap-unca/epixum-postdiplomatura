"use server";

import { revalidatePath } from "next/cache";
import { Course, User } from "@/types";
import { createServerClient } from "./pocketbase-server";
import { createServiceClient } from "./pocketbase-service";
import { hashEnrollmentKey, validateEnrollmentKey } from "./course-enrollment-key";
import { validateInvitationPassword } from "./course-invitations";
import { hashInvitationPassword } from "./course-invitation-password";

export type EnrollmentActionResult = {
  success: boolean;
  message?: string;
  error?: string;
  courseId?: string;
};

function isNotFound(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === 404
  );
}

export async function joinCourseByKey(key: string): Promise<EnrollmentActionResult> {
  const validation = validateEnrollmentKey(key);
  if (!validation.valid) return { success: false, error: validation.error };

  const pb = await createServerClient();
  const user = pb.authStore.model as unknown as User | null;

  if (!pb.authStore.isValid || !user) {
    return { success: false, error: "Debes ingresar para matricularte." };
  }

  try {
    const keyHash = hashEnrollmentKey(validation.normalized);
    const servicePb = await createServiceClient();
    const course = await servicePb.collection("courses").getFirstListItem<Course>(
      servicePb.filter('enrollmentMode = "clave" && enrollmentKeyHash = {:keyHash} && status != "borrador"', { keyHash }),
    );

    if (course.teachers?.includes(user.id)) {
      return { success: false, error: "No podés matricularte como estudiante en un curso donde sos docente." };
    }

    try {
      await pb.collection("course_enrollments").getFirstListItem(
        pb.filter("course = {:courseId} && student = {:studentId}", {
          courseId: course.id,
          studentId: user.id,
        }),
      );

      return {
        success: true,
        message: `Ya estabas matriculado en ${course.title}.`,
        courseId: course.id,
      };
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }

    try {
      await servicePb.collection("course_enrollments").create({
        course: course.id,
        student: user.id,
        keyHash,
      });
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
      if (status !== 400) throw error;

      try {
        await pb.collection("course_enrollments").getFirstListItem(
          pb.filter("course = {:courseId} && student = {:studentId}", {
            courseId: course.id,
            studentId: user.id,
          }),
        );
      } catch (lookupError) {
        if (isNotFound(lookupError)) throw error;
        throw lookupError;
      }
    }

    await servicePb.collection("course_enrollments").getFirstListItem(
      servicePb.filter("course = {:courseId} && student = {:studentId}", {
        courseId: course.id,
        studentId: user.id,
      }),
      { fields: "id" },
    );

    revalidatePath("/estudiantes");
    revalidatePath(`/estudiantes/cursos/${course.id}`);

    return {
      success: true,
      message: `Te matriculaste correctamente en ${course.title}.`,
      courseId: course.id,
    };
  } catch (error) {
    if (isNotFound(error)) {
      return { success: false, error: "La clave no corresponde a un curso disponible." };
    }

    console.error("Error al matricular al estudiante:", error);
    return { success: false, error: "No pudimos completar la matrícula. Inténtalo nuevamente." };
  }
}

export async function updateCourseEnrollmentKey(
  courseId: string,
  key: string,
): Promise<EnrollmentActionResult> {
  const validation = validateEnrollmentKey(key);
  if (!validation.valid) return { success: false, error: validation.error };

  const pb = await createServerClient();
  const user = pb.authStore.model as unknown as User | null;

  if (!pb.authStore.isValid || !user) {
    return { success: false, error: "No tienes permisos para gestionar esta clave." };
  }

  try {
    const course = await pb.collection("courses").getOne<Course>(courseId);
    const canManage = user.role === "admin" || course.teachers?.includes(user.id);

    if (!canManage) {
      return { success: false, error: "Solo los docentes asignados al curso pueden cambiar la clave." };
    }
    if ((course.enrollmentMode || "clave") !== "clave") {
      return { success: false, error: "Este curso utiliza contraseña con invitación." };
    }

    const servicePb = await createServiceClient();
    await servicePb.collection("courses").update(courseId, {
      enrollmentKeyHash: hashEnrollmentKey(validation.normalized),
    });

    revalidatePath(`/docentes/cursos/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);

    return { success: true, message: "La clave del curso fue actualizada." };
  } catch (error) {
    console.error("Error al actualizar la clave del curso:", error);
    return { success: false, error: "No pudimos actualizar la clave del curso." };
  }
}

export async function updateCourseInvitationPassword(
  courseId: string,
  password: string,
): Promise<EnrollmentActionResult> {
  const validation = validateInvitationPassword(password);
  if (!validation.valid) return { success: false, error: validation.error };

  const pb = await createServerClient();
  const user = pb.authStore.model as unknown as User | null;
  if (!pb.authStore.isValid || !user) {
    return { success: false, error: "No tienes permisos para gestionar esta contraseña." };
  }

  try {
    const course = await pb.collection("courses").getOne<Course>(courseId);
    const canManage = user.role === "admin" || course.teachers?.includes(user.id);
    if (!canManage) {
      return { success: false, error: "Solo administradores o docentes asignados pueden cambiar la contraseña." };
    }
    if (course.enrollmentMode !== "invitacion_contrasena") {
      return { success: false, error: "Este curso utiliza matrícula por clave." };
    }

    const servicePb = await createServiceClient();
    await servicePb.collection("courses").update(courseId, {
      invitationPasswordHash: hashInvitationPassword(validation.password),
    });
    revalidatePath(`/docentes/cursos/${courseId}`);
    revalidatePath(`/admin/courses/${courseId}`);
    return { success: true, message: "La contraseña compartida fue actualizada." };
  } catch {
    return { success: false, error: "No pudimos actualizar la contraseña compartida." };
  }
}
