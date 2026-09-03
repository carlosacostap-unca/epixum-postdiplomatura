import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  attempts: [] as Array<{ id: string; created: string }>,
  course: { id: "course-1", title: "Node.js", status: "en curso", enrollmentMode: "invitacion_contrasena", teachers: [] as string[] },
  email: "Alumno@Epixum.com",
  enrollmentExists: false,
  concurrentEnrollment: false,
  enrollmentCreate: vi.fn(),
  invitationUpdate: vi.fn(),
  coursePasswordCheck: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("./course-invitation-password", () => ({ hashInvitationPassword: (value: string) => `hash:${value}` }));
vi.mock("./pocketbase-service", () => ({
  createServiceClient: vi.fn(async () => ({
    filter: (expression: string, params: Record<string, string>) => ({ expression, params }),
    collection: (name: string) => {
      if (name === "courses") return {
        getFirstListItem: mocks.coursePasswordCheck.mockImplementation(async (filter: { params: { passwordHash: string } }) => {
          if (filter.params.passwordHash !== "hash:Correcta-1") throw Object.assign(new Error("not found"), { status: 404 });
          return { id: "course-1" };
        }),
      };
      if (name === "course_enrollments") return {
        create: mocks.enrollmentCreate.mockImplementation(async () => {
          if (mocks.concurrentEnrollment) {
            mocks.enrollmentExists = true;
            throw Object.assign(new Error("duplicate"), { status: 400 });
          }
          mocks.enrollmentExists = true;
          return { id: "enrollment-1" };
        }),
        getFirstListItem: vi.fn(async () => {
          if (!mocks.enrollmentExists) throw Object.assign(new Error("not found"), { status: 404 });
          return { id: "enrollment-1" };
        }),
      };
      if (name === "course_enrollment_invitations") return {
        getOne: vi.fn().mockResolvedValue({
          id: "inv-1",
          course: "course-1",
          emailNormalized: "alumno@epixum.com",
          status: "pendiente",
          expand: { course: mocks.course },
        }),
        update: mocks.invitationUpdate.mockResolvedValue({}),
      };
      throw new Error(`ColecciÃ³n de servicio inesperada: ${name}`);
    },
  })),
}));
vi.mock("./pocketbase-server", () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { isValid: true, model: { id: "student-1", role: "estudiante", email: mocks.email } },
    filter: (expression: string, params: Record<string, string>) => ({ expression, params }),
    collection: (name: string) => {
      if (name === "course_enrollments") return {
        getFirstListItem: vi.fn(async () => {
          if (!mocks.enrollmentExists) throw Object.assign(new Error("not found"), { status: 404 });
          return { id: "enrollment-1", course: "course-1", student: "student-1" };
        }),
      };
      if (name === "course_enrollment_invitations") return {
        getOne: vi.fn().mockResolvedValue({
          id: "inv-1",
          course: "course-1",
          emailNormalized: "alumno@epixum.com",
          status: "pendiente",
          expand: { course: mocks.course },
        }),
      };
      if (name === "course_enrollment_attempts") return {
        getFullList: vi.fn().mockImplementation(async () => [...mocks.attempts]),
        create: vi.fn(async () => {
          const attempt = { id: `attempt-${mocks.attempts.length + 1}`, created: new Date().toISOString() };
          mocks.attempts.push(attempt);
          return attempt;
        }),
      };
      if (name === "courses") return {
        getFirstListItem: mocks.coursePasswordCheck.mockImplementation(async (filter: { params: { passwordHash: string } }) => {
          if (filter.params.passwordHash !== "hash:Correcta-1") throw Object.assign(new Error("not found"), { status: 404 });
          return { id: "course-1" };
        }),
      };
      throw new Error(`Colección inesperada: ${name}`);
    },
  })),
}));

import { activateCourseInvitation } from "./actions-course-invitations";

describe("activación de invitaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-07T18:00:00.000Z"));
    mocks.attempts = [];
    mocks.course = { id: "course-1", title: "Node.js", status: "en curso", enrollmentMode: "invitacion_contrasena", teachers: [] };
    mocks.email = "Alumno@Epixum.com";
    mocks.enrollmentExists = false;
    mocks.concurrentEnrollment = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("crea la matrícula con prueba y activa la invitación", async () => {
    const result = await activateCourseInvitation("inv-1", "course-1", "Correcta-1");
    expect(result).toMatchObject({ success: true, courseId: "course-1" });
    expect(mocks.enrollmentCreate).toHaveBeenCalledWith(expect.objectContaining({ invitation: "inv-1", keyHash: "hash:Correcta-1" }));
    expect(mocks.invitationUpdate).toHaveBeenCalledWith("inv-1", expect.objectContaining({ status: "activada", activatedStudent: "student-1" }));
  });

  it("registra solamente el intento incorrecto y bloquea el quinto", async () => {
    mocks.attempts = [4, 3, 2, 1].map((minutesAgo, index) => ({ id: `attempt-${index}`, created: new Date(Date.now() - minutesAgo * 60_000).toISOString() }));
    const fifth = await activateCourseInvitation("inv-1", "course-1", "Incorrecta-1");
    expect(fifth).toMatchObject({ success: false, attemptsRemaining: 0 });
    expect(fifth.lockedUntil).toBeTruthy();
    expect(mocks.enrollmentCreate).not.toHaveBeenCalled();

    mocks.coursePasswordCheck.mockClear();
    const blocked = await activateCourseInvitation("inv-1", "course-1", "Correcta-1");
    expect(blocked).toMatchObject({ success: false, attemptsRemaining: 0 });
    expect(mocks.coursePasswordCheck).not.toHaveBeenCalled();
  });

  it("no serializa ni registra la contraseña, el HMAC o el secreto", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await activateCourseInvitation("inv-1", "course-1", "MuySecreta-9");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("MuySecreta-9");
    expect(serialized).not.toContain("hash:");
    expect(serialized).not.toContain("COURSE_ENROLLMENT_SECRET");
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("permite reintentar cuando vencieron los intentos anteriores", async () => {
    mocks.attempts = [16, 17, 18, 19, 20].map((minutesAgo, index) => ({ id: `old-${index}`, created: new Date(Date.now() - minutesAgo * 60_000).toISOString() }));
    expect(await activateCourseInvitation("inv-1", "course-1", "Correcta-1")).toMatchObject({ success: true });
  });

  it("rechaza identidad ajena, curso borrador o cambio de modalidad", async () => {
    mocks.email = "otro@epixum.com";
    expect(await activateCourseInvitation("inv-1", "course-1", "Correcta-1")).toMatchObject({ success: false });
    mocks.email = "alumno@epixum.com";
    mocks.course.status = "borrador";
    expect(await activateCourseInvitation("inv-1", "course-1", "Correcta-1")).toMatchObject({ success: false });
    mocks.course.status = "en curso";
    mocks.course.enrollmentMode = "clave";
    expect(await activateCourseInvitation("inv-1", "course-1", "Correcta-1")).toMatchObject({ success: false });
  });

  it("reconcilia una repetición y una creación concurrente", async () => {
    mocks.enrollmentExists = true;
    expect(await activateCourseInvitation("inv-1", "course-1", "Correcta-1")).toMatchObject({ success: true });
    expect(mocks.invitationUpdate).toHaveBeenCalled();

    mocks.enrollmentExists = false;
    mocks.concurrentEnrollment = true;
    expect(await activateCourseInvitation("inv-1", "course-1", "Correcta-1")).toMatchObject({ success: true });
  });

  it("conserva pendiente la invitación cuando la identidad ya enseña en el curso", async () => {
    mocks.course.teachers = ["student-1"];
    const result = await activateCourseInvitation("inv-1", "course-1", "Correcta-1");
    expect(result).toMatchObject({ success: false, error: expect.stringContaining("docente") });
    expect(mocks.enrollmentCreate).not.toHaveBeenCalled();
    expect(mocks.invitationUpdate).not.toHaveBeenCalled();
  });
});
