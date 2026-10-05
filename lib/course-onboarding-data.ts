import "server-only";
import { createServerClient } from "./pocketbase-server";
import { createServiceClient } from "./pocketbase-service";
import { readOnboarding, requireOnboardingAccess } from "./course-onboarding-service";
import type { CourseOnboarding, SubmittedOnboardingSurvey } from "./course-onboarding";
import type { User } from "@/types";

export async function getStudentOnboarding(courseId: string) {
  const pb = await createServerClient();
  const access = await requireOnboardingAccess(pb, courseId);
  const service = await createServiceClient();
  const state = await readOnboarding(service, courseId, access.user.id);
  // Only personal fields needed by the form cross the client boundary.
  const { firstName = "", lastName = "", dni = "", birthDate = "", phone = "", email } = access.user;
  return { course: access.course, enrolled: access.enrolled, profile: { firstName, lastName, dni, birthDate: birthDate.slice(0, 10), phone, email }, ...state };
}

export async function getOnboardingReport(courseId: string) {
  const pb = await createServerClient();
  const { course, user } = await requireOnboardingAccess(pb, courseId, "manager");
  const service = await createServiceClient();
  const filter = service.filter("course = {:course}", { course: courseId });
  const [progress, surveys, invitations, enrollments] = await Promise.all([
    service.collection("course_onboarding").getFullList<CourseOnboarding>({ filter, fields: `id,course,student,profileConfirmedAt,requirementsAcceptedAt,completedAt${user.role === "admin" ? ",emailChangeRequested" : ""}` }),
    service.collection("course_onboarding_surveys").getFullList<SubmittedOnboardingSurvey>({ filter }),
    service.collection("course_enrollment_invitations").getFullList<{ emailNormalized: string }>({ filter: filter + ' && status != "revocada"', fields: "emailNormalized" }),
    service.collection("course_enrollments").getFullList<{ student: string }>({ filter, fields: "student" }),
  ]);
  const emails = [...new Set(invitations.map(item => item.emailNormalized))];
  const ids = [...new Set(enrollments.map(item => item.student))];
  const conditions = [...emails.map(email => service.filter("email:lower = {:email}", { email })), ...ids.map(id => service.filter("id = {:id}", { id }))];
  const profiles: Pick<User, "id" | "email" | "name">[] = [];
  for (let i = 0; i < conditions.length; i += 40) {
    profiles.push(...await service.collection("users").getFullList<Pick<User, "id" | "email" | "name">>({ filter: conditions.slice(i, i + 40).join(" || "), fields: "id,email,name" }));
  }
  const unique = [...new Map(profiles.map(profile => [profile.id, profile])).values()];
  const participants = unique.map(profile => ({
    id: profile.id, name: profile.name || profile.email, email: profile.email,
    progress: progress.find(item => item.student === profile.id) || null,
    survey: surveys.find(item => item.student === profile.id) || null,
  }));
  for (const email of emails) if (!unique.some(profile => profile.email.toLowerCase() === email)) participants.push({ id: email, name: "Sin cuenta creada", email, progress: null, survey: null });
  participants.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return { course, participants, admin: user.role === "admin" };
}
