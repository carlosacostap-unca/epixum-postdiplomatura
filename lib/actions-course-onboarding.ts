"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "./pocketbase-server";
import { createServiceClient } from "./pocketbase-service";
import { cleanSurvey, ONBOARDING_VERSION, onboardingProfileSchema, surveyDraftSchema, surveySchema } from "./course-onboarding";
import { ensureOnboarding, firstOrNull, readOnboarding, requireOnboardingAccess } from "./course-onboarding-service";
import type { CourseOnboarding, SubmittedOnboardingSurvey } from "./course-onboarding";

type Result = { success: true } | { success: false; error: string };
function refresh(courseId: string) {
  for (const path of ["/estudiantes", "/profile", `/estudiantes/cursos/${courseId}`, `/estudiantes/cursos/${courseId}/onboarding`, `/docentes/cursos/${courseId}/onboarding`, `/admin/courses/${courseId}/onboarding`]) revalidatePath(path);
}
async function context(courseId: string) {
  const pb = await createServerClient();
  const access = await requireOnboardingAccess(pb, courseId);
  const service = await createServiceClient();
  return { ...access, service };
}
// Errors returned to the browser must never include raw PocketBase responses.
const failed = (): Result => ({ success: false, error: "No pudimos guardar los cambios. Revisá tu acceso al curso e intentá nuevamente." });

export async function confirmOnboardingProfile(courseId: string, input: unknown): Promise<Result> {
  const parsed = onboardingProfileSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  try {
    const { user, service } = await context(courseId);
    const progress = await ensureOnboarding(service, courseId, user.id);
    if (progress.profileConfirmedAt) return { success: true };
    const { firstName, lastName, dni, birthDate, phone, emailChangeRequested } = parsed.data;
    const profile = { firstName, lastName, dni, birthDate, phone };
    await service.collection("users").update(user.id, { ...profile, name: `${profile.firstName} ${profile.lastName}`, birthDate: profile.birthDate + "T12:00:00.000Z" });
    await service.collection("course_onboarding").update(progress.id, {
      profileConfirmedAt: new Date().toISOString(),
      emailChangeRequested: emailChangeRequested.toLowerCase() === user.email.toLowerCase() ? "" : emailChangeRequested.toLowerCase(),
    });
    refresh(courseId);
    return { success: true };
  } catch { return failed(); }
}

export async function saveOnboardingSurvey(courseId: string, input: unknown, submit: boolean): Promise<Result> {
  if (typeof submit !== "boolean") return { success: false, error: "Operación inválida." };
  const parsed = (submit ? surveySchema : surveyDraftSchema).safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
  try {
    const { user, service } = await context(courseId);
    const { progress, survey } = await readOnboarding(service, courseId, user.id);
    if (!progress?.profileConfirmedAt) return { success: false, error: "Primero confirmá tus datos personales." };
    if (survey) return { success: true };
    const answers = cleanSurvey(parsed.data);
    if (submit) {
      try {
        await service.collection("course_onboarding_surveys").create({ course: courseId, student: user.id, answers, version: ONBOARDING_VERSION });
      } catch (error) {
        const concurrent = await firstOrNull<SubmittedOnboardingSurvey>(service, "course_onboarding_surveys", service.filter("course = {:course} && student = {:student}", { course: courseId, student: user.id }));
        if (!concurrent) throw error;
      }
    } else {
      await service.collection("course_onboarding").update(progress.id, { surveyDraft: answers });
    }
    refresh(courseId);
    return { success: true };
  } catch { return failed(); }
}

export async function acceptOnboardingRequirements(courseId: string, accepted: boolean): Promise<Result> {
  if (accepted !== true) return { success: false, error: "Confirmá que leíste los requisitos para las clases en vivo." };
  try {
    const { user, service } = await context(courseId);
    const { progress, survey } = await readOnboarding(service, courseId, user.id);
    if (!progress?.profileConfirmedAt || !survey) return { success: false, error: "Completá tus datos y la encuesta antes de finalizar." };
    if (!progress.completedAt) {
      const now = new Date().toISOString();
      await service.collection("course_onboarding").update<CourseOnboarding>(progress.id, { requirementsAcceptedAt: now, completedAt: now, requirementsVersion: ONBOARDING_VERSION, surveyDraft: null });
    }
    refresh(courseId);
    return { success: true };
  } catch { return failed(); }
}
