"use server";

import { revalidatePath } from "next/cache";
import type { Course, CourseEnrollmentAttempt, CourseEnrollmentInvitation, User } from "@/types";
import { createServerClient } from "./pocketbase-server";
import { createServiceClient } from "./pocketbase-service";
import {
  getInvitationLockState,
  normalizeInvitationEmail,
  parseInvitationEmails,
  validateInvitationPassword,
} from "./course-invitations";
import { hashInvitationPassword } from "./course-invitation-password";

export interface InvitationImportResult {
  success: boolean;
  created: string[];
  existing: string[];
  revoked: string[];
  invalid: string[];
  duplicates: string[];
  error?: string;
}

export interface InvitationActivationResult {
  success: boolean;
  courseId?: string;
  message?: string;
  error?: string;
  attemptsRemaining?: number;
  lockedUntil?: string;
}

function isNotFound(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

async function requireAdmin() {
  const pb = await createServerClient();
  const user = pb.authStore.model as unknown as User | null;
  if (!pb.authStore.isValid || !user || user.role !== "admin") {
    throw new Error("No tienes permisos para gestionar invitaciones.");
  }
  return pb;
}

function revalidateInvitationSurfaces(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath("/estudiantes", "layout");
}

export async function createCourseInvitations(courseId: string, input: string): Promise<InvitationImportResult> {
  const parsed = parseInvitationEmails(input);
  const result: InvitationImportResult = {
    success: parsed.valid.length > 0,
    created: [],
    existing: [],
    revoked: [],
    invalid: parsed.invalid,
    duplicates: parsed.duplicates,
  };
  if (parsed.valid.length === 0) {
    return { ...result, success: false, error: "Ingresá al menos un email válido." };
  }

  const pb = await requireAdmin();
  const course = await pb.collection("courses").getOne<Course>(courseId, { fields: "id,enrollmentMode" });
  if (course.enrollmentMode !== "invitacion_contrasena") {
    return { ...result, success: false, error: "Activá la modalidad de email y contraseña antes de cargar invitaciones." };
  }

  for (const emailNormalized of parsed.valid) {
    try {
      const existing = await pb.collection("course_enrollment_invitations").getFirstListItem<CourseEnrollmentInvitation>(
        pb.filter("course = {:courseId} && emailNormalized = {:email}", { courseId, email: emailNormalized }),
        { fields: "id,emailNormalized,status" },
      );
      if (existing.status === "revocada") result.revoked.push(emailNormalized);
      else result.existing.push(emailNormalized);
      continue;
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }

    try {
      await pb.collection("course_enrollment_invitations").create({
        course: courseId,
        emailNormalized,
        status: "pendiente",
      });
      result.created.push(emailNormalized);
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
      if (status !== 400) throw error;
      result.existing.push(emailNormalized);
    }
  }

  revalidateInvitationSurfaces(courseId);
  return { ...result, success: true };
}

export async function revokeCourseInvitation(invitationId: string) {
  const pb = await requireAdmin();
  try {
    const invitation = await pb.collection("course_enrollment_invitations").getOne<CourseEnrollmentInvitation>(invitationId, {
      fields: "id,course,status",
    });
    if (invitation.status !== "pendiente") {
      return { success: false as const, error: "Sólo se pueden revocar invitaciones pendientes." };
    }
    await pb.collection("course_enrollment_invitations").update(invitationId, { status: "revocada" });
    revalidateInvitationSurfaces(invitation.course);
    return { success: true as const };
  } catch {
    return { success: false as const, error: "No pudimos revocar la invitación." };
  }
}

async function findExistingEnrollment(pb: Awaited<ReturnType<typeof createServerClient>>, courseId: string, studentId: string) {
  try {
    return await pb.collection("course_enrollments").getFirstListItem(
      pb.filter("course = {:courseId} && student = {:studentId}", { courseId, studentId }),
      { fields: "id,course,student,invitation" },
    );
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

async function reconcileActivatedInvitation(
  pb: Awaited<ReturnType<typeof createServiceClient>>,
  invitationId: string,
  studentId: string,
) {
  try {
    await pb.collection("course_enrollment_invitations").update(invitationId, {
      status: "activada",
      activatedStudent: studentId,
      activatedAt: new Date().toISOString(),
    });
  } catch {
    // La matrícula es la fuente de verdad. Una repetición posterior reconcilia
    // la invitación si hubo una interrupción entre ambas escrituras.
  }
}

export async function activateCourseInvitation(
  invitationId: string,
  courseId: string,
  password: string,
): Promise<InvitationActivationResult> {
  const pb = await createServerClient();
  const user = pb.authStore.model as unknown as User | null;
  if (!pb.authStore.isValid || !user || !user.email) {
    return { success: false, error: "No pudimos validar la invitación." };
  }

  try {
    const servicePb = await createServiceClient();
    const invitation = await servicePb.collection("course_enrollment_invitations").getOne<CourseEnrollmentInvitation>(invitationId, {
      expand: "course",
      fields: "id,course,emailNormalized,status,expand.course.id,expand.course.title,expand.course.status,expand.course.enrollmentMode,expand.course.teachers",
    });
    const course = invitation.expand?.course;
    const identityMatches = invitation.emailNormalized === normalizeInvitationEmail(user.email);
    if (invitation.course !== courseId || !identityMatches || !course) {
      return { success: false, error: "No pudimos validar la invitaciÃ³n." };
    }

    if (course.teachers?.includes(user.id)) {
      return { success: false, error: "No podés activar una matrícula en un curso donde sos docente." };
    }

    const existingEnrollment = await findExistingEnrollment(pb, courseId, user.id);
    if (existingEnrollment && invitation.status !== "revocada") {
      await reconcileActivatedInvitation(servicePb, invitationId, user.id);
      revalidateInvitationSurfaces(courseId);
      return { success: true, courseId, message: "Ya estabas matriculado en este curso." };
    }

    if (
      invitation.status !== "pendiente" ||
      course.status === "borrador" ||
      course.enrollmentMode !== "invitacion_contrasena"
    ) {
      return { success: false, error: "No pudimos validar la invitación." };
    }

    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const attempts = await pb.collection("course_enrollment_attempts").getFullList<CourseEnrollmentAttempt>({
      filter: pb.filter(
        "course = {:courseId} && invitation = {:invitationId} && student = {:studentId} && created > {:cutoff}",
        { courseId, invitationId, studentId: user.id, cutoff },
      ),
      fields: "id,created",
      sort: "created",
    });
    const lockState = getInvitationLockState(attempts);
    if (lockState.blocked) {
      return {
        success: false,
        error: "Alcanzaste el límite de intentos. Esperá 15 minutos para volver a probar.",
        ...lockState,
      };
    }

    const passwordValidation = validateInvitationPassword(password);
    let passwordMatches = false;
    if (passwordValidation.valid) {
      const passwordHash = hashInvitationPassword(passwordValidation.password);
      try {
        await servicePb.collection("courses").getFirstListItem<Course>(
          servicePb.filter(
            'id = {:courseId} && enrollmentMode = "invitacion_contrasena" && status != "borrador" && invitationPasswordHash = {:passwordHash}',
            { courseId, passwordHash },
          ),
          { fields: "id" },
        );
        passwordMatches = true;
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    }

    if (!passwordMatches) {
      const failedAttempt = await pb.collection("course_enrollment_attempts").create<CourseEnrollmentAttempt>({
        course: courseId,
        invitation: invitationId,
        student: user.id,
      });
      const nextLockState = getInvitationLockState([...attempts, failedAttempt]);
      return {
        success: false,
        error: nextLockState.blocked
          ? "Alcanzaste el límite de intentos. Esperá 15 minutos para volver a probar."
          : "La contraseña no es correcta.",
        ...nextLockState,
      };
    }

    const keyHash = hashInvitationPassword(password);
    try {
      await servicePb.collection("course_enrollments").create({
        course: courseId,
        student: user.id,
        invitation: invitationId,
        keyHash,
      });
    } catch (error) {
      const status = typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
      if (status !== 400 || !(await findExistingEnrollment(pb, courseId, user.id))) throw error;
    }

    const confirmedEnrollment = await servicePb.collection("course_enrollments").getFirstListItem(
      servicePb.filter("course = {:courseId} && student = {:studentId}", { courseId, studentId: user.id }),
      { fields: "id" },
    );
    if (!confirmedEnrollment) throw new Error("No se pudo verificar la matrícula creada.");

    await reconcileActivatedInvitation(servicePb, invitationId, user.id);
    revalidateInvitationSurfaces(courseId);
    return {
      success: true,
      courseId,
      message: `Te matriculaste correctamente en ${course.title}.`,
    };
  } catch {
    return { success: false, error: "No pudimos completar la matrícula. Intentá nuevamente." };
  }
}
