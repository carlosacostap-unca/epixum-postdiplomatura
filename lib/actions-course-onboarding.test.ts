import { beforeEach, describe, expect, it, vi } from "vitest";
import type PocketBase from "pocketbase";
import { requireOnboardingAccess } from "./course-onboarding-service";
import { confirmOnboardingProfile, saveOnboardingSurvey, acceptOnboardingRequirements } from "./actions-course-onboarding";

const m = vi.hoisted(() => ({
  user: { id: "student-1", role: "estudiante", email: "student@example.com" },
  course: { id: "course-1", onboardingEnabled: true, teachers: ["teacher-1"], status: "en curso", enrollmentMode: "invitacion_contrasena" },
  valid: true, enrolled: true, invited: false,
  progress: null as Record<string, unknown> | null, survey: null as Record<string, unknown> | null,
  write: vi.fn(), service: vi.fn(), refresh: vi.fn(),
}));
const notFound = () => Promise.reject({ status: 404 });
const session = {
  authStore: { get isValid() { return m.valid; }, get record() { return m.user; } },
  filter: (value: string, params: unknown) => JSON.stringify({ value, params }),
  collection: (name: string) => ({
    getOne: async () => m.course,
    getFirstListItem: async () => name === "course_enrollments" && m.enrolled || name === "course_enrollment_invitations" && m.invited ? { id: "allowed" } : notFound(),
  }),
};
const service = {
  filter: session.filter,
  collection: (name: string) => ({
    getFirstListItem: async () => (name === "course_onboarding" ? m.progress : m.survey) || notFound(),
    create: async (data: Record<string, unknown>) => {
      m.write(name, "create", data);
      const record = { id: name, ...data };
      if (name === "course_onboarding") m.progress = record; else m.survey = record;
      return record;
    },
    update: async (id: string, data: Record<string, unknown>) => {
      m.write(name, "update", id, data);
      if (name === "course_onboarding") m.progress = { ...m.progress, ...data };
      return m.progress;
    },
  }),
};
vi.mock("./pocketbase-server", () => ({ createServerClient: async () => session }));
vi.mock("./pocketbase-service", () => ({ createServiceClient: () => m.service() }));
vi.mock("next/cache", () => ({ revalidatePath: m.refresh }));
const profile = { firstName: "Maria", lastName: "Prueba", dni: "12345678", birthDate: "1990-01-15", phone: "3834000000", confirmed: true };
const answers = { experience: "never", frequency: "none", paidAccess: ["no"], goals: ["sources"] };

beforeEach(() => {
  m.valid = true; m.enrolled = true; m.invited = false;
  m.user = { id: "student-1", role: "estudiante", email: "student@example.com" };
  m.course = { id: "course-1", onboardingEnabled: true, teachers: ["teacher-1"], status: "en curso", enrollmentMode: "invitacion_contrasena" };
  m.progress = null; m.survey = null; m.write.mockReset(); m.refresh.mockReset();
  m.service.mockReset().mockResolvedValue(service);
});
describe("acceso y secuencia del onboarding", () => {
  it("autoriza al invitado pendiente sin crear matrícula", async () => {
    m.enrolled = false; m.invited = true;
    expect((await confirmOnboardingProfile("course-1", profile)).success).toBe(true);
    expect(m.write.mock.calls.some(call => call[0] === "course_enrollments")).toBe(false);
  });
  it.each(["anonymous", "outsider", "disabled", "draft", "teacher"])("deniega %s antes de crear el cliente privilegiado", async kind => {
    if (kind === "anonymous") m.valid = false;
    if (kind === "outsider") m.enrolled = false;
    if (kind === "disabled") m.course.onboardingEnabled = false;
    if (kind === "draft") m.course.status = "borrador";
    if (kind === "teacher") m.user.id = "teacher-1";
    expect((await confirmOnboardingProfile("course-1", profile)).success).toBe(false);
    expect(m.service).not.toHaveBeenCalled();
    expect(m.write).not.toHaveBeenCalled();
  });
  it("ignora IDs del cliente y guarda solicitud de email sin cambiar identidad", async () => {
    await confirmOnboardingProfile("course-1", { ...profile, student: "victim", email: "victim@example.com", emailChangeRequested: "nuevo@example.com" });
    expect(m.write).toHaveBeenCalledWith("users", "update", "student-1", expect.objectContaining({ firstName: "Maria" }));
    const userWrite = m.write.mock.calls.find(call => call[0] === "users")!;
    expect(userWrite[3]).not.toHaveProperty("email");
    expect(m.progress).toMatchObject({ emailChangeRequested: "nuevo@example.com", student: "student-1" });
  });
  it("no confirma el perfil si falla su actualización", async () => {
    m.write.mockImplementationOnce(() => {}).mockImplementationOnce(() => { throw new Error("network"); });
    expect((await confirmOnboardingProfile("course-1", profile)).success).toBe(false);
    expect(m.progress?.profileConfirmedAt).toBeUndefined();
  });
  it("impide saltar las primeras etapas y exige aceptación explícita", async () => {
    expect((await saveOnboardingSurvey("course-1", answers, true)).success).toBe(false);
    expect((await acceptOnboardingRequirements("course-1", true)).success).toBe(false);
    expect((await acceptOnboardingRequirements("course-1", false)).success).toBe(false);
    expect(m.write).not.toHaveBeenCalled();
  });
  it("conserva la primera encuesta y finaliza de manera idempotente", async () => {
    await confirmOnboardingProfile("course-1", profile);
    await saveOnboardingSurvey("course-1", { experience: "never" }, false);
    expect(m.progress?.surveyDraft).toMatchObject({ experience: "never" });
    await saveOnboardingSurvey("course-1", answers, true);
    await saveOnboardingSurvey("course-1", { ...answers, problem: "otro" }, true);
    expect(m.write.mock.calls.filter(call => call[0] === "course_onboarding_surveys")).toHaveLength(1);
    expect((await acceptOnboardingRequirements("course-1", true)).success).toBe(true);
    const before = m.write.mock.calls.length;
    await acceptOnboardingRequirements("course-1", true);
    expect(m.write).toHaveBeenCalledTimes(before);
    expect(m.progress?.requirementsAcceptedAt).toBeTruthy();
  });
  it("admite docente asignado con rol estudiante y rechaza docente ajeno", async () => {
    m.user.id = "teacher-1";
    await expect(requireOnboardingAccess(session as unknown as PocketBase, "course-1", "manager")).resolves.toBeTruthy();
    m.user.id = "other"; m.user.role = "docente";
    await expect(requireOnboardingAccess(session as unknown as PocketBase, "course-1", "manager")).rejects.toThrow();
  });
});
