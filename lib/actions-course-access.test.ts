import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: "admin",
  mode: "clave",
  update: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("./pocketbase-server", () => ({
  createServerClient: vi.fn(async () => ({
    authStore: { isValid: true, model: { id: "actor", role: mocks.role } },
    collection: () => ({
      update: vi.fn(async (_id: string, data: { enrollmentMode: string }) => { mocks.mode = data.enrollmentMode; mocks.update(data); }),
      getOne: vi.fn(async () => ({ id: "course-1", enrollmentMode: mocks.mode })),
    }),
  })),
}));
vi.mock("./pocketbase-service", () => ({ createServiceClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { updateCourseEnrollmentMode } from "./actions-course-enrollment";

describe("modalidad administrativa de acceso", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.role = "admin"; mocks.mode = "clave"; });

  it("permite al admin cambiarla y verifica el valor persistido", async () => {
    await expect(updateCourseEnrollmentMode("course-1", "invitacion_contrasena")).resolves.toMatchObject({ success: true });
    expect(mocks.update).toHaveBeenCalledWith({ enrollmentMode: "invitacion_contrasena" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/estudiantes", "layout");
  });

  it.each(["docente", "estudiante"])("rechaza el rol %s", async (role) => {
    mocks.role = role;
    await expect(updateCourseEnrollmentMode("course-1", "invitacion_contrasena")).resolves.toMatchObject({ success: false, error: expect.stringContaining("administradores") });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rechaza modalidades manipuladas antes de acceder a PocketBase", async () => {
    await expect(updateCourseEnrollmentMode("course-1", "otra" as never)).resolves.toMatchObject({ success: false });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
