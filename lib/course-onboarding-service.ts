import "server-only";
import type PocketBase from "pocketbase";
import type { Course, User } from "@/types";
import type { CourseOnboarding, SubmittedOnboardingSurvey } from "./course-onboarding";

export async function firstOrNull<T>(pb: PocketBase, collection: string, filter: string, fields?: string): Promise<T | null> {
  try { return await pb.collection(collection).getFirstListItem<T>(filter, { fields }); }
  catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 404) return null;
    throw error;
  }
}

export async function requireOnboardingAccess(pb: PocketBase, courseId: string, mode: "student" | "manager" = "student") {
  const user = pb.authStore.record as unknown as User | null;
  if (!pb.authStore.isValid || !user?.id) throw new Error("Iniciá sesión para continuar.");
  const course = await pb.collection("courses").getOne<Course>(courseId);
  if (!course.onboardingEnabled) throw new Error("Este curso no tiene onboarding habilitado.");
  if (mode === "manager") {
    if (user.role !== "admin" && !course.teachers?.includes(user.id)) throw new Error("No tenés acceso al seguimiento de este curso.");
    return { course, user, enrolled: false };
  }
  if (course.status === "borrador" || course.teachers?.includes(user.id)) throw new Error("No tenés acceso al onboarding de este curso.");
  const enrollment = await firstOrNull(pb, "course_enrollments", pb.filter("course = {:course} && student = {:student}", { course: course.id, student: user.id }), "id");
  if (!enrollment) {
    const invitation = course.enrollmentMode === "invitacion_contrasena" && user.email
      ? await firstOrNull(pb, "course_enrollment_invitations", pb.filter('course = {:course} && emailNormalized = {:email} && status = "pendiente"', { course: course.id, email: user.email.trim().toLowerCase() }), "id")
      : null;
    if (!invitation) throw new Error("Necesitás una invitación vigente o una matrícula en este curso.");
  }
  return { course, user, enrolled: Boolean(enrollment) };
}

export async function readOnboarding(service: PocketBase, course: string, student: string) {
  const filter = service.filter("course = {:course} && student = {:student}", { course, student });
  const [progress, survey] = await Promise.all([
    firstOrNull<CourseOnboarding>(service, "course_onboarding", filter),
    firstOrNull<SubmittedOnboardingSurvey>(service, "course_onboarding_surveys", filter),
  ]);
  return { progress, survey };
}

export async function ensureOnboarding(service: PocketBase, course: string, student: string) {
  const existing = await firstOrNull<CourseOnboarding>(service, "course_onboarding", service.filter("course = {:course} && student = {:student}", { course, student }));
  if (existing) return existing;
  try { return await service.collection("course_onboarding").create<CourseOnboarding>({ course, student }); }
  catch (error) {
    // The unique index arbitrates simultaneous first visits.
    const concurrent = await firstOrNull<CourseOnboarding>(service, "course_onboarding", service.filter("course = {:course} && student = {:student}", { course, student }));
    if (concurrent) return concurrent;
    throw error;
  }
}
