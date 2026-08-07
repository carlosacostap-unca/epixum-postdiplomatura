import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  serviceCreate: vi.fn(),
  serviceUpdate: vi.fn(),
  createServerClient: vi.fn(),
  createServiceClient: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("./pocketbase-server", () => ({ createServerClient: mocks.createServerClient }));
vi.mock("./pocketbase-service", () => ({ createServiceClient: mocks.createServiceClient }));

import { joinCourseByKey, updateCourseInvitationPassword } from "./actions-course-enrollment";

describe("matrícula inmediata por clave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.COURSE_ENROLLMENT_SECRET = "test-secret-with-at-least-thirty-two-characters";
    const notFound = Object.assign(new Error("not found"), { status: 404 });
    mocks.createServerClient.mockResolvedValue({
      authStore: { isValid: true, model: { id: "student-a", role: "estudiante" } },
      filter: (expression: string) => expression,
      collection: (name: string) => {
        if (name === "courses") return { getFirstListItem: vi.fn().mockResolvedValue({ id: "course-a", title: "Curso A" }) };
        if (name === "course_enrollments") return { getFirstListItem: vi.fn().mockRejectedValue(notFound) };
        throw new Error(`Colección inesperada: ${name}`);
      },
    });
    mocks.createServiceClient.mockResolvedValue({
      filter: (expression: string) => expression,
      collection: (name: string) => {
        if (name === "courses") return { getFirstListItem: vi.fn().mockResolvedValue({ id: "course-a", title: "Curso A" }) };
        if (name === "course_enrollments") return { create: mocks.serviceCreate.mockResolvedValue({ id: "enrollment-a" }) };
        throw new Error(`ColecciÃ³n de servicio inesperada: ${name}`);
      },
    });
  });

  it("crea la matrícula en el mismo envío y devuelve acceso al curso", async () => {
    const result = await joinCourseByKey("CLAVE-VALIDA");
    expect(mocks.serviceCreate).toHaveBeenCalledWith(expect.objectContaining({ course: "course-a", student: "student-a" }));
    expect(result).toMatchObject({ success: true, courseId: "course-a" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/estudiantes");
  });
});

describe("contraseña compartida del curso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.COURSE_ENROLLMENT_SECRET = "test-secret-with-at-least-thirty-two-characters";
  });

  function credentialClient(role: string, userId: string, teachers = ["teacher-a"]) {
    mocks.createServerClient.mockResolvedValue({
      authStore: { isValid: true, model: { id: userId, role } },
      collection: () => ({
        getOne: vi.fn().mockResolvedValue({ id: "course-a", enrollmentMode: "invitacion_contrasena", teachers }),
      }),
    });
    mocks.createServiceClient.mockResolvedValue({
      collection: () => ({ update: mocks.serviceUpdate.mockResolvedValue({ id: "course-a" }) }),
    });
  }

  it("permite rotar a administradores y conserva sensibilidad a mayúsculas", async () => {
    credentialClient("admin", "admin-a");
    expect((await updateCourseInvitationPassword("course-a", "Clave-ABC")).success).toBe(true);
    expect((await updateCourseInvitationPassword("course-a", "clave-ABC")).success).toBe(true);
    const firstHash = mocks.serviceUpdate.mock.calls[0][1].invitationPasswordHash;
    const secondHash = mocks.serviceUpdate.mock.calls[1][1].invitationPasswordHash;
    expect(firstHash).toHaveLength(64);
    expect(firstHash).not.toBe(secondHash);
  });

  it("permite al docente asignado y rechaza al ajeno", async () => {
    credentialClient("docente", "teacher-a");
    expect((await updateCourseInvitationPassword("course-a", "Segura-123")).success).toBe(true);
    credentialClient("docente", "teacher-b");
    expect((await updateCourseInvitationPassword("course-a", "Segura-123")).success).toBe(false);
  });

  it("rechaza contraseñas fuera de política antes de consultar PocketBase", async () => {
    const result = await updateCourseInvitationPassword("course-a", "corta");
    expect(result.success).toBe(false);
    expect(mocks.createServerClient).not.toHaveBeenCalled();
  });
});
